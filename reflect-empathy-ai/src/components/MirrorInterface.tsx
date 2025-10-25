import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Send, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const MirrorInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    startVideo();
    return () => {
      stopVideo();
      stopRecording();
    };
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true // Enable audio for recording
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsVideoActive(true);
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
    }
  };

  const toggleVideo = () => {
    if (isVideoActive) {
      stopVideo();
    } else {
      startVideo();
    }
  };

  const uploadVideoToBackend = async (videoBlob: Blob) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', videoBlob, `recording-${Date.now()}.webm`);
      formData.append('timestamp', new Date().toISOString());

      // Update this URL to match your Python backend
      const response = await fetch('http://localhost:8000/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      toast({
        title: 'Video Uploaded',
        description: 'Your video has been sent for analysis.',
      });

      // Use the actual AI response from backend
      if (result.analysis) {
        addMessage('assistant', result.analysis.response || "I've analyzed your video and I'm here to help!");
      } else {
        addMessage('assistant', "I've received your video and I'm processing it. How can I help you today?");
      }

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload video. Please check if the backend server is running.',
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
      recordedChunksRef.current = [];
      
      // Create media recorder with both video and audio
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordedChunksRef.current.length === 0) {
          toast({
            title: 'No Recording',
            description: 'No video data was recorded.',
            variant: 'destructive',
          });
          return;
        }

        const videoBlob = new Blob(recordedChunksRef.current, { 
          type: 'video/webm' 
        });
        
        // Upload to backend
        await uploadVideoToBackend(videoBlob);
        
        // Create a local URL for preview (optional)
        const videoUrl = URL.createObjectURL(videoBlob);
        console.log('Recorded video URL:', videoUrl);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(videoUrl), 1000);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: 'Recording Error',
          description: 'An error occurred while recording.',
          variant: 'destructive',
        });
      };

      // Start recording with 1-second chunks for better real-time processing
      mediaRecorder.start(1000);
      setIsRecording(true);
      
      toast({
        title: 'Recording Started',
        description: 'Video is being recorded and will be uploaded...',
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
      setIsRecording(false);
      
      toast({
        title: 'Recording Stopped',
        description: 'Processing your video...',
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
      
      // Simulate AI response
      setTimeout(() => {
        addMessage('assistant', "I understand. Let me help you with that. This is a demo response that shows how the chat interface works with your input.");
      }, 1000);
    }
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
          
          {/* Status Overlay */}
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
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            )}
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-6 right-6">
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
        </div>
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
                  <p className="text-sm">Start a conversation or record your video thoughts.</p>
                  <p className="text-xs mt-2 text-muted-foreground/70">
                    Recordings are sent to AI for analysis
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
              <p className="text-sm text-muted-foreground mb-1">Recording Status</p>
              <p className="text-lg font-bold">
                {isRecording ? '🔴 Recording' : isUploading ? '📤 Uploading' : '✅ Ready'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Videos are analyzed by AI in real-time
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