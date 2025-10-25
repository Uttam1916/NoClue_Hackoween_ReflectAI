// file: src/components/MirrorWithOnboarding.tsx
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * MirrorWithOnboarding.tsx
 * - Shows onboarding quiz modal before allowing interaction with mirror
 * - Saves config to localStorage (key: reflectai_onboarding_config)
 * - POSTs config to /api/onboarding/config
 * - Exports mapAnswersToConfig and default MirrorInterface
 */

/* ---------------- Types ---------------- */
export type RawAnswers = {
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
};

export type OnboardingConfig = {
  mode: string;
  tone: string;
  depth: string;
  intervention_type: string;
  frequency: string;
  audio_enabled: boolean;
  raw_answers: RawAnswers;
};

export function mapAnswersToConfig(raw: RawAnswers): OnboardingConfig {
  const q1 = raw.q1 ?? "";
  const q2 = raw.q2 ?? "";
  const q3 = raw.q3 ?? "";
  const q4 = raw.q4 ?? "";
  const q5 = raw.q5 ?? "";
  const q6 = raw.q6 ?? "";

  const mode =
    q1.includes("Understand") || q1.toLowerCase().includes("mood") ? "mood_monitoring" :
    q1.includes("Emotional") ? "emotional_support" :
    q1.includes("Manage") ? "stress_management" : "demo";

  const tone =
    q2.includes("Short") ? "direct" : q2.includes("Warm") ? "warm" : "reflective";

  const depth =
    q3.includes("Avoid") ? "light" : q3.includes("Neutral") ? "neutral" : "deep";

  const intervention_type =
    q4.includes("Calming") ? "breathing" :
    q4.includes("Encouraging") ? "encouragement" :
    q4.includes("Journaling") ? "journaling" : "coping_tips";

  const frequency =
    q5.includes("Only") ? "demo" :
    q5.includes("day") ? "daily" : "multiple_daily";

  const audio_enabled = q6.toLowerCase().includes("play") || q6.toLowerCase().includes("voice");

  return {
    mode,
    tone,
    depth,
    intervention_type,
    frequency,
    audio_enabled,
    raw_answers: raw,
  };
}

/* ---------------- Onboarding Quiz Component ---------------- */
type QuizProps = {
  onSaved?: (cfg: OnboardingConfig) => void;
  apiUrl?: string;
};

const QUESTIONS: { id: keyof RawAnswers; q: string; opts: string[] }[] = [
  {
    id: "q1",
    q: "What brings you here today?",
    opts: ["Understand my mood", "Emotional support", "Manage stress", "Just trying it out / demo"],
  },
  {
    id: "q2",
    q: "When receiving responses, I prefer:",
    opts: ["Short & direct", "Warm & conversational", "Reflective & deep"],
  },
  {
    id: "q3",
    q: "How sensitive should the assistant be?",
    opts: ["Avoid heavy topics", "Neutral — fine with gentle emotional content", "Open to deeper talk"],
  },
  {
    id: "q4",
    q: "Which help style would you like MOST?",
    opts: ["Calming techniques (breathing, grounding)", "Encouraging / motivational lines", "Journaling prompts / reflection", "Stress-coping tips / education"],
  },
  {
    id: "q5",
    q: "How often will you use this?",
    opts: ["Only for this demo", "Once a day or less", "Multiple times a day"],
  },
  {
    id: "q6",
    q: "Audio feedback?",
    opts: ["Text only", "Also play soft voice/gentle tone"],
  },
];

function OnboardingQuiz({ onSaved, apiUrl = "/api/onboarding/config" }: QuizProps) {
  const [step, setStep] = useState(0);
  const [rawAnswers, setRawAnswers] = useState<RawAnswers>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function setAnswer(id: keyof RawAnswers, v: string) {
    setRawAnswers((s) => ({ ...s, [id]: v }));
  }

  async function handleSubmit() {
    setSaving(true);
    setMessage(null);
    const cfg = mapAnswersToConfig(rawAnswers);

    // save locally
    try {
      localStorage.setItem("reflectai_onboarding_config", JSON.stringify(cfg));
    } catch (e) {
      console.warn("localStorage save failed", e);
    }

    // POST to backend (best-effort)
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.warn("backend returned non-ok:", res.status, txt);
        setMessage("Saved locally. Backend save failed.");
      } else {
        setMessage("Saved! Your preferences are set.");
      }
    } catch (err) {
      console.warn("POST failed", err);
      setMessage("Saved locally. Could not reach backend.");
    } finally {
      setSaving(false);
      onSaved?.(cfg);
    }
  }

  const current = QUESTIONS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-2xl bg-card rounded-2xl p-6 shadow-2xl">
        <h3 className="text-xl font-semibold mb-3">Quick setup</h3>
        <div className="text-sm mb-4">Step {step + 1} of {QUESTIONS.length}</div>

        <div className="mb-4">
          <div className="font-medium mb-2">{current.q}</div>
          <div>
            {current.opts.map((opt) => {
              const checked = rawAnswers[current.id] === opt;
              return (
                <label key={opt} className={`block mb-2 p-3 rounded-lg cursor-pointer ${checked ? "border-2 border-primary" : "border border-border"}`}>
                  <input
                    type="radio"
                    name={current.id}
                    value={opt}
                    checked={checked}
                    onChange={() => setAnswer(current.id, opt)}
                    className="mr-2"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="px-4 py-2 rounded-md border">
            Back
          </button>

          {step < QUESTIONS.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(QUESTIONS.length - 1, s + 1))}
              disabled={!rawAnswers[current.id]}
              className="px-4 py-2 rounded-md bg-primary text-white"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || Object.keys(rawAnswers).length < QUESTIONS.length}
              className="px-4 py-2 rounded-md bg-accent text-white"
            >
              {saving ? "Saving..." : "Submit"}
            </button>
          )}
        </div>

        {message && <div className="mt-3 text-sm">{message}</div>}
      </div>
    </div>
  );
}

/* ---------------- Mirror Interface (your provided UI merged) ---------------- */

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const MirrorInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Onboarding gating: show quiz until config exists
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      return !Boolean(localStorage.getItem("reflectai_onboarding_config"));
    } catch {
      return true;
    }
  });

  useEffect(() => {
    // start camera immediately (mirror preview) even if onboarding is shown,
    // but the quiz modal will block interactions visually.
    startVideo();
    return () => stopVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsVideoActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to use the mirror.",
        variant: "destructive",
      });
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        // TODO: send audioBlob to backend for transcription
        console.log("Audio recorded:", audioBlob);

        setTimeout(() => {
          addMessage("assistant", "I can see you're feeling good today! How can I help you?");
        }, 1000);
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Speak now...",
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);

      toast({
        title: "Recording Stopped",
        description: "Processing your message...",
      });
    }
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleSendText = () => {
    if (inputText.trim()) {
      addMessage("user", inputText);
      setInputText("");

      setTimeout(() => {
        addMessage(
          "assistant",
          "I understand. Let me help you with that. This is a demo response that shows how the chat interface works with your input."
        );
      }, 1000);
    }
  };

  // Onboarding saved handler
  const handleOnboardingSaved = (cfg: OnboardingConfig) => {
    // Hide modal
    setShowOnboarding(false);
    // Optionally show a toast
    toast({
      title: "Welcome!",
      description: "Your preferences have been saved. Enjoy ReflectAI.",
    });

    // Make cfg available globally if needed (window) - optional
    try {
      (window as any).__REFLECTAI_ONBOARDING__ = cfg;
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background flex gap-6 p-6 relative">
      {showOnboarding && (
        <OnboardingQuiz onSaved={handleOnboardingSaved} apiUrl="/api/onboarding/config" />
      )}

      {/* Mirror/Video Section */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative rounded-3xl overflow-hidden border border-border bg-card backdrop-blur-glass shadow-2xl">
          <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-[70vh] object-cover scale-x-[-1]" />

          {/* Status Overlay */}
          <div className="absolute top-6 left-6 flex gap-3">
            <div className="px-4 py-2 rounded-full bg-card/40 backdrop-blur-md border border-glass-border flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isVideoActive ? "bg-accent animate-pulse" : "bg-muted"}`} />
              <span className="text-sm font-medium">{isVideoActive ? "Camera Active" : "Camera Off"}</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-card/40 backdrop-blur-md border border-glass-border flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? "bg-destructive animate-pulse" : "bg-muted"}`} />
              <span className="text-sm font-medium">{isRecording ? "Recording" : "Ready"}</span>
            </div>
          </div>

          {/* Title Overlay */}
          <div className="absolute bottom-6 left-6">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">ReflectAI</h1>
            <p className="text-muted-foreground">Your Personal Wellness Mirror</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          <Button onClick={toggleVideo} variant={isVideoActive ? "default" : "secondary"} size="lg" className="rounded-full px-6">
            {isVideoActive ? <Video className="mr-2 h-5 w-5" /> : <VideoOff className="mr-2 h-5 w-5" />}
            {isVideoActive ? "Camera On" : "Camera Off"}
          </Button>

          <Button onClick={isRecording ? stopRecording : startRecording} variant={isRecording ? "destructive" : "default"} size="lg" className="rounded-full px-6">
            {isRecording ? <MicOff className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Button>
        </div>
      </div>

      {/* Chat Section */}
      <div className="w-[450px] flex flex-col gap-4">
        <div className="flex-1 rounded-3xl border border-border bg-card backdrop-blur-glass p-6 shadow-2xl flex flex-col">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-accent bg-clip-text text-transparent">AI Companion</h2>

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
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-gradient-primary text-white" : "bg-secondary text-foreground border border-border"}`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
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
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              placeholder="Type a message..."
              className="flex-1 bg-secondary border border-border rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <Button onClick={handleSendText} size="icon" className="rounded-full h-12 w-12 bg-gradient-primary hover:opacity-90">
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
