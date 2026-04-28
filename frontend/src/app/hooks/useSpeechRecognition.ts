"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseSpeechRecognitionOptions {
    onTranscript?: (text: string) => void;
}

interface UseSpeechRecognitionReturn {
    startListening: () => void;
    stopListening: () => void;
    transcript: string;
    isListening: boolean;
    isSupported: boolean;
}

export function useSpeechRecognition(
    options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
    const { onTranscript } = options;
    const [transcript, setTranscript] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognitionAPI =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            setIsSupported(false);
            return;
        }

        setIsSupported(true);

        const recognition: any = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        recognition.onresult = (event: any) => {
            let finalText = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                }
            }
            if (finalText) {
                setTranscript((prev) => prev + finalText);
                onTranscript?.(finalText);
            }
        };

        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognitionRef.current = recognition;

        return () => {
            recognition.abort();
        };
    }, [onTranscript]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || isListening) return;
        setTranscript("");
        recognitionRef.current.start();
        setIsListening(true);
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current || !isListening) return;
        recognitionRef.current.stop();
        setIsListening(false);
    }, [isListening]);

    return { startListening, stopListening, transcript, isListening, isSupported };
}