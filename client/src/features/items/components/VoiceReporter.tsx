import React, { useState, useRef } from 'react';
import { Mic, Square, Check, RotateCcw, Loader2, FileAudio, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import api from '../../../services/api';

interface ExtractedData {
  itemName: string;
  category: string;
  color: string;
  brand: string;
  model: string;
  location: string;
  type: string;
  description: string;
}

interface VoiceReporterProps {
  onApplyResults: (data: Partial<ExtractedData>) => void;
}

const VoiceReporter: React.FC<VoiceReporterProps> = ({ onApplyResults }) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [language, setLanguage] = useState('en');
  const [transcript, setTranscript] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = handleStop;

      mediaRecorderRef.current.start();
      setStatus('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setStatus('error');
      setErrorMessage('Microphone permission is required for voice reporting. Please allow access and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    if (audioBlob.size === 0) {
      setStatus('error');
      setErrorMessage('No audio recorded. Please try again.');
      return;
    }
    
    setStatus('processing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'report.webm');
      formData.append('language', language);

      const response = await api.post('/items/voice-analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setTranscript(response.data.transcript);
        setExtractedData(response.data.extractedData);
        setStatus('success');
      } else {
        throw new Error(response.data.message || 'Failed to process voice report.');
      }
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.response?.data?.message || 'Unable to understand the voice input. Please try again or enter the details manually.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    setStatus('idle');
    setTranscript('');
    setExtractedData(null);
    setErrorMessage('');
    setRecordingTime(0);
  };

  const applyToForm = () => {
    if (extractedData) {
      onApplyResults(extractedData);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#800000]/10 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Mic className="w-5 h-5 mr-2 text-[#800000]" />
            Smart Voice Reporting
          </h3>
          <p className="text-sm text-gray-500 mt-1">Speak naturally to automatically fill the form.</p>
        </div>
        
        {status === 'idle' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-500">Language:</span>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-[#800000] focus:border-[#800000] p-1.5"
            >
              <option value="en">English</option>
              <option value="si">Sinhala</option>
              <option value="mixed">Mixed (En/Si)</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center py-4">
        {status === 'idle' && (
          <button 
            type="button"
            onClick={startRecording}
            className="flex items-center justify-center space-x-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all w-full md:w-auto"
          >
            <Mic className="w-5 h-5 text-red-500" />
            <span>Start Voice Reporting</span>
          </button>
        )}

        {status === 'recording' && (
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-3 mb-4">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="font-mono font-medium text-red-600">Recording... {formatTime(recordingTime)}</span>
            </div>
            <button 
              type="button"
              onClick={stopRecording}
              className="flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold py-3 px-6 rounded-xl transition-all"
            >
              <Square className="w-5 h-5" fill="currentColor" />
              <span>Stop Recording</span>
            </button>
          </div>
        )}

        {status === 'processing' && (
          <div className="flex flex-col items-center space-y-3 text-gray-600">
            <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
            <div className="text-sm font-medium animate-pulse">Converting speech & understanding your report...</div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center w-full">
            <div className="bg-red-50 text-red-700 p-4 rounded-xl w-full text-center border border-red-100 text-sm mb-4 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {errorMessage}
            </div>
            <button 
              type="button"
              onClick={reset}
              className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Try Again
            </button>
          </div>
        )}

        {status === 'success' && extractedData && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full text-left"
          >
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recognized Speech</h4>
              <p className="text-gray-800 text-sm italic">"{transcript}"</p>
            </div>
            
            <div className="bg-[#800000]/5 rounded-xl border border-[#800000]/20 p-4 relative overflow-hidden">
              <h4 className="text-xs font-bold text-[#800000] uppercase tracking-wider mb-3">Extracted Information</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><span className="text-gray-500 text-xs block">Item Name</span><span className="font-semibold">{extractedData.itemName || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">Category</span><span className="font-semibold">{extractedData.category || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">Report Type</span><span className="font-semibold">{extractedData.type || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">Color</span><span className="font-semibold">{extractedData.color || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">Brand</span><span className="font-semibold">{extractedData.brand || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">Location</span><span className="font-semibold">{extractedData.location || '-'}</span></div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#800000]/10 flex flex-col md:flex-row justify-between items-center gap-3">
                <button 
                  type="button"
                  onClick={reset}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-800 flex items-center"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Discard
                </button>
                <button 
                  type="button"
                  onClick={applyToForm}
                  className="bg-[#800000] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-[#600000] transition-colors flex items-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Apply to Form
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VoiceReporter;
