import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Backend API base URL
const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkinHistory, setCheckinHistory] = useState([]);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Initialize webcam and microphone
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: true 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Could not access webcam or microphone. Please check permissions.');
      }
    };

    initializeMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureFrame = () => {
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    audioChunksRef.current = [];
    
    // Get audio track only for recording
    const audioStream = new MediaStream(streamRef.current.getAudioTracks());
    
    mediaRecorderRef.current = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
    
    // Auto-stop after 3 seconds
    setTimeout(() => {
      if (isRecording) {
        stopRecording();
      }
    }, 3000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      mediaRecorderRef.current.onstop = async () => {
        await processCheckin();
      };
    }
  };

  const processCheckin = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Capture frame
      const frameBlob = await captureFrame();
      
      // Get audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      // Create form data
      const formData = new FormData();
      formData.append('frame', frameBlob, 'frame.jpg');
      formData.append('audio', audioBlob, 'audio.webm');

      // Send to backend
      const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      const data = response.data;
      setResult(data);

      // Add to local history
      const newCheckin = {
        id: Date.now(),
        timestamp: new Date(),
        face_emotion: data.face_emotion,
        transcript: data.transcript,
        reply: data.reply
      };
      
      setCheckinHistory(prev => [newCheckin, ...prev.slice(0, 4)]); // Keep last 5

      // Text-to-speech for the reply
      if (data.reply && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.reply);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('Error during check-in:', error);
      setResult({
        error: 'Failed to analyze. Please try again.',
        face_emotion: 'unknown',
        transcript: '',
        reply: 'Sorry, I encountered an error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = () => {
    if (!isRecording) {
      startRecording();
    }
    // Stop recording is handled by timeout
  };

  const getEmoji = (emotion) => {
    const emojis = {
      happy: '😄',
      sad: '😢',
      neutral: '😐',
      angry: '😠',
      surprised: '😲',
      tired: '😴',
      fear: '😨',
      disgust: '🤢'
    };
    return emojis[emotion] || '🤔';
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      happy: '#4ade80',
      sad: '#60a5fa', 
      neutral: '#9ca3af',
      angry: '#f87171',
      surprised: '#fbbf24',
      tired: '#a78bfa'
    };
    return colors[emotion] || '#6b7280';
  };

  return (
    <div className="mirror-container">
      <div className="mirror-ui">
        <h1 className="app-title">ReflectAI</h1>
        <p className="app-subtitle">Your emotional wellness mirror</p>
        
        <div className="media-section">
          <div className="video-container">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className="webcam-feed"
            />
            <div className={`recording-indicator ${isRecording ? 'active' : ''}`}>
              ● Recording {isRecording && '(3s)'}
            </div>
          </div>
        </div>

        <div className="controls">
          <button 
            className={`checkin-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleCheckin}
            disabled={loading || isRecording}
          >
            {loading ? 'Analyzing...' : 
             isRecording ? 'Recording...' : 
             'Check-in (3s)'}
          </button>
        </div>

        {loading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Analyzing your emotions...</p>
          </div>
        )}

        {result && !loading && (
          <div className="result-section">
            <div 
              className="emotion-display"
              style={{ borderColor: getEmotionColor(result.face_emotion) }}
            >
              <span className="emotion-emoji">
                {getEmoji(result.face_emotion)}
              </span>
              <span className="emotion-text">
                {result.face_emotion}
              </span>
            </div>
            
            {result.transcript && result.transcript !== "I am feeling okay today." && (
              <div className="transcript">
                <strong>You said:</strong> "{result.transcript}"
              </div>
            )}
            
            <div className="reply">
              <strong>ReflectAI:</strong> {result.reply}
            </div>
          </div>
        )}

        {checkinHistory.length > 0 && (
          <div className="history-section">
            <h3>Recent Check-ins</h3>
            <div className="history-list">
              {checkinHistory.map((checkin) => (
                <div key={checkin.id} className="history-item">
                  <span 
                    className="history-emoji"
                    style={{ color: getEmotionColor(checkin.face_emotion) }}
                  >
                    {getEmoji(checkin.face_emotion)}
                  </span>
                  <span className="history-time">
                    {checkin.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <span className="history-emotion">
                    {checkin.face_emotion}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;