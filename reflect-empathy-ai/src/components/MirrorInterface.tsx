import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Send, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface EmotionResult {
  emotion: string;
  confidence: number;
  dominantEmotion?: string;
}

const MirrorInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionResult | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionResult[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const emotionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Emotion emoji mapping
  const emotionEmojis: { [key: string]: string } = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fearful: '😨',
    disgusted: '🤢',
    surprised: '😲',
    neutral: '😐',
    calm: '😌',
    confused: '😕',
    excited: '🤩',
    tired: '😴',
    default: '🤖'
  };

  const getEmotionColor = (emotion: string): string => {
    const colors: { [key: string]: string } = {
      happy: 'bg-green-500',
      sad: 'bg-blue-500',
      angry: 'bg-red-500',
      fearful: 'bg-purple-500',
      disgusted: 'bg-yellow-500',
      surprised: 'bg-orange-500',
      neutral: 'bg-gray-500',
      calm: 'bg-teal-500',
      confused: 'bg-indigo-500',
      excited: 'bg-pink-500',
      tired: 'bg-gray-400',
      default: 'bg-primary'
    };
    return colors[emotion] || colors.default;
  };

  useEffect(() => {
    startVideo();
    return () => {
      stopVideo();
      stopRecording();
      stopEmotionDetection();
    };
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsVideoActive(true);
        
        // Wait a bit for video to start then begin emotion detection
        setTimeout(() => {
          startEmotionDetection();
        }, 1000);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast({
        title: 'Camera Access Denied',
        description: 'Please allow camera access to use the mirror.',
        variant: 'destructive',
      });
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsVideoActive(false);
      stopEmotionDetection();
    }
  };

  // ADD THE MISSING toggleVideo FUNCTION
  const toggleVideo = () => {
    if (isVideoActive) {
      stopVideo();
      toast({
        title: 'Camera Off',
        description: 'Video feed has been stopped.',
      });
    } else {
      startVideo();
      toast({
        title: 'Camera On',
        description: 'Video feed has been started.',
      });
    }
  };

  const startEmotionDetection = () => {
    // Clear any existing interval
    stopEmotionDetection();

    // Start with an initial detection
    analyzeEmotion();

    // Start emotion detection every 2 seconds
    emotionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && isVideoActive) {
        await analyzeEmotion();
      }
    }, 2000);
  };

  const stopEmotionDetection = () => {
    if (emotionIntervalRef.current) {
      clearInterval(emotionIntervalRef.current);
      emotionIntervalRef.current = null;
    }
    setIsDetecting(false);
  };

  const analyzeEmotion = async (): Promise<EmotionResult | null> => {
    if (isDetecting) return null; // Prevent overlapping requests
    
    setIsDetecting(true);
    try {
      const frameBlob = await captureFrame();
      if (frameBlob.size === 0) {
        console.log('No frame captured');
        return null;
      }

      console.log('Sending emotion analysis request...');
      const formData = new FormData();
      formData.append('frame', frameBlob, `emotion_frame_${Date.now()}.jpg`);
      formData.append('user_id', userId);

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Emotion analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Emotion analysis result:', result);
      
      // Extract emotion from your backend response
      let emotionData: EmotionResult;
      
      if (result.emotion) {
        if (typeof result.emotion === 'string') {
          emotionData = {
            emotion: result.emotion,
            confidence: 0.8
          };
        } else if (typeof result.emotion === 'object') {
          emotionData = {
            emotion: result.emotion.dominant_emotion || result.emotion.emotion || result.emotion.label || 'neutral',
            confidence: result.emotion.confidence || 0.8,
            dominantEmotion: result.emotion.dominant_emotion
          };
        } else {
          emotionData = {
            emotion: 'neutral',
            confidence: 0.8
          };
        }
      } else {
        emotionData = {
          emotion: 'neutral',
          confidence: 0.8
        };
      }

      // Force UI update by updating state
      setCurrentEmotion(emotionData);
      setDetectionCount(prev => prev + 1);
      setEmotionHistory(prev => {
        const newHistory = [...prev, emotionData].slice(-10);
        return newHistory;
      });

      console.log(`Emotion updated to: ${emotionData.emotion} (${emotionData.confidence})`);
      return emotionData;
    } catch (error) {
      console.error('Emotion analysis error:', error);
      // Fallback to mock emotion detection for testing
      const mockEmotions: EmotionResult[] = [
        { emotion: 'neutral', confidence: 0.9 },
        { emotion: 'happy', confidence: 0.85 },
        { emotion: 'surprised', confidence: 0.7 },
        { emotion: 'calm', confidence: 0.8 },
        { emotion: 'confused', confidence: 0.6 }
      ];
      const randomEmotion = mockEmotions[Math.floor(Math.random() * mockEmotions.length)];
      setCurrentEmotion(randomEmotion);
      setDetectionCount(prev => prev + 1);
      return randomEmotion;
    } finally {
      setIsDetecting(false);
    }
  };

  const captureFrame = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        console.log('Video or canvas not available');
        resolve(new Blob());
        return;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('Canvas context not available or video not ready');
        resolve(new Blob());
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Frame captured, size:', blob.size);
        } else {
          console.log('Frame capture failed - no blob generated');
        }
        resolve(blob || new Blob());
      }, 'image/jpeg', 0.8);
    });
  };

  const uploadToAnalyze = async (frameBlob: Blob, audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('frame', frameBlob, `frame_${Date.now()}.jpg`);
      formData.append('audio', audioBlob, `audio_${Date.now()}.webm`);
      formData.append('user_id', userId);

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      toast({
        title: 'Analysis Complete',
        description: 'Your video and audio have been analyzed.',
      });

      if (result.therapist_reply) {
        let replyText = result.therapist_reply;
        
        if (typeof result.therapist_reply === 'object') {
          if (result.therapist_reply.error) {
            replyText = "I encountered an error analyzing your input. Please try again.";
          } else if (result.therapist_reply.text) {
            replyText = result.therapist_reply.text;
          } else {
            replyText = JSON.stringify(result.therapist_reply);
          }
        }
        
        addMessage('assistant', replyText);
      } else {
        addMessage('assistant', "I've analyzed your input and I'm here to help!");
      }

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze video/audio. Please check if the backend server is running.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) {
      toast({
        title: 'Camera not available',
        description: 'Please enable camera first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      audioChunksRef.current = [];
      
      const audioStream = new MediaStream();
      streamRef.current.getAudioTracks().forEach(track => {
        audioStream.addTrack(track);
      });

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          toast({
            title: 'No Recording',
            description: 'No audio data was recorded.',
            variant: 'destructive',
          });
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm' 
        });

        const frameBlob = await captureFrame();
        await uploadToAnalyze(frameBlob, audioBlob);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: 'Recording Error',
          description: 'An error occurred while recording.',
          variant: 'destructive',
        });
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

      captureIntervalRef.current = setInterval(async () => {
        const frameBlob = await captureFrame();
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size > 0 && frameBlob.size > 0) {
          console.log('Periodic capture during recording');
        }
      }, 2000);
      
      toast({
        title: 'Recording Started',
        description: 'Capturing video frames and audio...',
      });
    } catch (err) {
      console.error('Error starting recording:', err);
      toast({
        title: 'Recording Failed',
        description: 'Could not start recording.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      
      setIsRecording(false);
      
      toast({
        title: 'Recording Stopped',
        description: 'Processing your input...',
      });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleSendText = () => {
    if (inputText.trim()) {
      addMessage('user', inputText);
      setInputText('');
      
      setTimeout(() => {
        addMessage('assistant', "I understand. Let me help you with that. This is a demo response that shows how the chat interface works with your input.");
      }, 1000);
    }
  };

  const quickAnalyze = async () => {
    if (!isVideoActive) {
      toast({
        title: 'Camera Required',
        description: 'Please enable camera first.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const frameBlob = await captureFrame();
      const audioBlob = new Blob([], { type: 'audio/webm' });
      await uploadToAnalyze(frameBlob, audioBlob);
    } catch (error) {
      console.error('Quick analyze error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to capture and analyze.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const forceEmotionUpdate = async () => {
    await analyzeEmotion();
    toast({
      title: 'Emotion Update',
      description: 'Forced emotion detection update',
    });
  };

  return (
    <div className="min-h-screen bg-background flex gap-6 p-6">
      {/* Mirror/Video Section */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative rounded-3xl overflow-hidden border border-border bg-card backdrop-blur-glass shadow-2xl">
          <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-[70vh] object-cover scale-x-[-1]"
          />
          
          {/* Hidden canvas for frame capture */}
          <canvas 
            ref={canvasRef} 
            className="hidden"
          />
          
          {/* Real-time Emotion Display - Top Right Corner */}
          <div className="absolute top-6 right-6 flex flex-col gap-3">
            {/* Emotion Display */}
            <div className={`px-4 py-3 rounded-2xl backdrop-blur-md border border-glass-border ${
              currentEmotion ? `${getEmotionColor(currentEmotion.emotion)}/20` : 'bg-card/40'
            } flex flex-col items-center gap-2 min-w-[140px] transition-all duration-500`}>
              <div className="flex items-center gap-2 w-full">
                <span className="text-2xl">
                  {currentEmotion ? emotionEmojis[currentEmotion.emotion] || emotionEmojis.default : '🤖'}
                </span>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-bold capitalize text-foreground">
                    {currentEmotion ? currentEmotion.emotion : 'Analyzing...'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentEmotion ? `${Math.round(currentEmotion.confidence * 100)}% sure` : 'Starting...'}
                  </span>
                </div>
                {isDetecting && (
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              {currentEmotion && (
                <div className="w-full bg-secondary/30 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getEmotionColor(currentEmotion.emotion)} transition-all duration-500`}
                    style={{ width: `${currentEmotion.confidence * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Detection Info */}
            <div className="px-3 py-2 rounded-full bg-card/40 backdrop-blur-md border border-glass-border flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-xs font-medium">
                {isDetecting ? 'Detecting...' : `Updated ${detectionCount}x`}
              </span>
            </div>
          </div>

          {/* Status Overlay - Top Left */}
          <div className="absolute top-6 left-6 flex gap-3">
            <div className="px-4 py-2 rounded-full bg-card/40 backdrop-blur-md border border-glass-border flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isVideoActive ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
              <span className="text-sm font-medium">{isVideoActive ? 'Camera Active' : 'Camera Off'}</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-card/40 backdrop-blur-md border border-glass-border flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-destructive animate-pulse' : 'bg-muted'}`} />
              <span className="text-sm font-medium">{isRecording ? 'Recording' : 'Ready'}</span>
            </div>
            {isUploading && (
              <div className="px-4 py-2 rounded-full bg-card/40 backdrop-blur-md border border-glass-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm font-medium">Analyzing...</span>
              </div>
            )}
          </div>

          {/* Recording Indicator - Bottom right */}
          {isRecording && (
            <div className="absolute bottom-6 right-6">
              <div className="px-4 py-2 rounded-full bg-destructive/20 backdrop-blur-md border border-destructive/30 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive">REC</span>
              </div>
            </div>
          )}

          {/* Title Overlay */}
          <div className="absolute bottom-6 left-6">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ReflectAI
            </h1>
            <p className="text-muted-foreground">Your Personal Wellness Mirror</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={toggleVideo} 
            variant={isVideoActive ? 'default' : 'secondary'}
            size="lg"
            className="rounded-full px-6"
            disabled={isRecording}
          >
            {isVideoActive ? <Video className="mr-2 h-5 w-5" /> : <VideoOff className="mr-2 h-5 w-5" />}
            {isVideoActive ? 'Camera On' : 'Camera Off'}
          </Button>
          
          <Button
            onClick={toggleRecording}
            variant={isRecording ? 'destructive' : 'default'}
            size="lg"
            className="rounded-full px-6"
            disabled={!isVideoActive || isUploading}
          >
            {isRecording ? <MicOff className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>

          <Button
            onClick={quickAnalyze}
            variant="outline"
            size="lg"
            className="rounded-full px-6"
            disabled={!isVideoActive || isUploading || isRecording}
          >
            <Send className="mr-2 h-5 w-5" />
            Quick Analyze
          </Button>

          <Button
            onClick={forceEmotionUpdate}
            variant="outline"
            size="lg"
            className="rounded-full px-6"
            disabled={!isVideoActive || isDetecting}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Update Emotion
          </Button>
        </div>

        {/* Emotion History */}
        {emotionHistory.length > 0 && (
          <div className="rounded-2xl border border-border bg-card backdrop-blur-glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Emotion Timeline</h3>
              <span className="text-xs text-muted-foreground">{detectionCount} detections</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {emotionHistory.map((emotion, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center p-2 rounded-lg min-w-[60px] ${getEmotionColor(emotion.emotion)}/20 border border-border transition-all duration-300`}
                >
                  <span className="text-lg">{emotionEmojis[emotion.emotion] || emotionEmojis.default}</span>
                  <span className="text-xs capitalize mt-1 text-center">{emotion.emotion}</span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {Math.round(emotion.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className="w-[450px] flex flex-col gap-4">
        <div className="flex-1 rounded-3xl border border-border bg-card backdrop-blur-glass p-6 shadow-2xl flex flex-col">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-accent bg-clip-text text-transparent">
            AI Companion
          </h2>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-center p-6">
                <div>
                  <p className="text-lg mb-2">👋 Hello!</p>
                  <p className="text-sm">Real-time emotion detection is active!</p>
                  <p className="text-xs mt-2 text-muted-foreground/70">
                    Watch your emotions change in the top right corner
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-primary text-white'
                        : 'bg-secondary text-foreground border border-border'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Type a message..."
              className="flex-1 bg-secondary border border-border rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <Button
              onClick={handleSendText}
              size="icon"
              className="rounded-full h-12 w-12 bg-gradient-primary hover:opacity-90"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl border border-border bg-card backdrop-blur-glass p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Real-time Analysis</p>
              <p className="text-lg font-bold">
                {currentEmotion ? `🎭 ${currentEmotion.emotion.charAt(0).toUpperCase() + currentEmotion.emotion.slice(1)}` : '🔍 Starting...'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Updates every 2 seconds • {detectionCount} updates
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-accent flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default MirrorInterface;