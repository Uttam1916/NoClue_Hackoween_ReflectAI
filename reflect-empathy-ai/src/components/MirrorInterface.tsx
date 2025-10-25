import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Send } from 'lucide-react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    startVideo();
    return () => {
      stopVideo();
    };
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // Here you would send the audio to your backend
        console.log('Audio recorded:', audioBlob);
        
        // Simulate AI response for demo
        setTimeout(() => {
          addMessage('assistant', "I can see you're feeling good today! How can I help you?");
        }, 1000);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: 'Recording Started',
        description: 'Speak now...',
      });
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      toast({
        title: 'Recording Stopped',
        description: 'Processing your message...',
      });
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
          </div>

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
          >
            {isVideoActive ? <Video className="mr-2 h-5 w-5" /> : <VideoOff className="mr-2 h-5 w-5" />}
            {isVideoActive ? 'Camera On' : 'Camera Off'}
          </Button>
          
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? 'destructive' : 'default'}
            size="lg"
            className="rounded-full px-6"
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
                  <p className="text-sm">Start a conversation or record your thoughts.</p>
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

        {/* Emotion Status Card */}
        <div className="rounded-2xl border border-border bg-card backdrop-blur-glass p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Mood</p>
              <p className="text-2xl font-bold">😊 Happy</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-accent flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MirrorInterface;
