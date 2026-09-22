require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { v4: uuidv4 } = require('uuid');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

['uploads', 'output'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = uuidv4();
    cb(null, `${unique}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/mp3'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم. استخدم MP4, MOV, AVI, MKV, WEBM, MP3, WAV'));
  }
});

function formatSrtTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
}

function generateSrt(segments) {
  return segments.map((seg, i) => {
    const start = formatSrtTime(seg.start);
    const end = formatSrtTime(seg.end);
    return `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`;
  }).join('\n');
}

function generateVtt(segments) {
  const vttTime = s => {
    const [h, m, rest] = s.split(':');
    return `${h}:${m}:${rest.replace(',', '.')}`;
  };
  let vtt = 'WEBVTT\n\n';
  segments.forEach((seg, i) => {
    const start = vttTime(formatSrtTime(seg.start));
    const end = vttTime(formatSrtTime(seg.end));
    vtt += `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n\n`;
  });
  return vtt;
}

function extractAudio(videoPath, outputAudioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat('mp3')
      .audioBitrate(128)
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', () => resolve(outputAudioPath))
      .on('error', err => reject(err))
      .save(outputAudioPath);
  });
}

async function transcribeWithGroq(audioPath, language) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('مفيش مفتاح GROQ_API_KEY في ملف .env');

  const formData = new (require('form-data'))();
  formData.append('file', fs.createReadStream(audioPath));
  formData.append('model', 'whisper-large-v3');
  if (language && language !== 'auto') {
    formData.append('language', language);
  }
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
    headers: {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${apiKey}`
    },
    maxBodyLength: Infinity,
    timeout: 120000
  });

  return response.data;
}

function cleanup(files) {
  files.forEach(f => {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e) {}
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'السيرفر شغال ✅' });
});

app.post('/api/transcribe', upload.single('video'), async (req, res) => {
  const filesToCleanup = [];
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'مفيش ملف مرفوع!' });
    }

    const videoPath = req.file.path;
    filesToCleanup.push(videoPath);
    
    const language = req.body.language || 'auto';
    const jobId = uuidv4();
    
    console.log(`🎬 [${jobId}] Processing: ${req.file.originalname}`);

    const audioPath = path.join('uploads', `${jobId}.mp3`);
    filesToCleanup.push(audioPath);
    
    await extractAudio(videoPath, audioPath);
    console.log(`🔊 [${jobId}] Audio extracted`);

    const result = await transcribeWithGroq(audioPath, language);
    console.log(`📝 [${jobId}] Transcription done`);

    const srtContent = generateSrt(result.segments);
    const vttContent = generateVtt(result.segments);
    const txtContent = result.text;

    const srtPath = path.join('output', `${jobId}.srt`);
    const vttPath = path.join('output', `${jobId}.vtt`);
    const txtPath = path.join('output', `${jobId}.txt`);

    fs.writeFileSync(srtPath, srtContent, 'utf-8');
    fs.writeFileSync(vttPath, vttContent, 'utf-8');
    fs.writeFileSync(txtPath, txtContent, 'utf-8');

    cleanup(filesToCleanup);

    res.json({
      success: true,
      jobId,
      text: result.text,
      language: result.language,
      duration: result.duration,
      segments: result.segments,
      files: {
        srt: `/api/download/${jobId}.srt`,
        vtt: `/api/download/${jobId}.vtt`,
        txt: `/api/download/${jobId}.txt`
      }
    });

  } catch (error) {
    cleanup(filesToCleanup);
    console.error('❌ Error:', error.message);
    res.status(500).json({
      error: error.response?.data?.error?.message || error.message || 'حدث خطأ غير متوقع'
    });
  }
});

app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'output', req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'الملف مش موجود' });
  }
  res.download(filePath);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'خطأ في السيرفر' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 السيرفر شغال على: http://localhost:${PORT}`);
  console.log(`📁 افتح المتصفح وروح للرابط ده`);
  console.log(`🔑 تأكد إنك حاطط GROQ_API_KEY في ملف .env\n`);
});