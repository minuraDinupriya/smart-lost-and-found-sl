import React, { useState, useEffect } from 'react';
import { Sparkles, Upload, RefreshCw, CheckCircle2, Edit3, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';

export interface AIIdentificationResult {
  category: string;
  categoryConfidence: number | null;
  itemName: string;
  itemNameConfidence: number | null;
  color: string;
  colorConfidence: number | null;
  brand: string;
  brandConfidence: number | null;
  model: string;
  modelConfidence: number | null;
  description: string;
}

interface AIItemIdentifierProps {
  imageFile: File | null;
  onImageChange: (file: File | null) => void;
  onApplyResults: (details: {
    title: string;
    category: string;
    description: string;
    color: string;
    brand: string;
    model: string;
    aiIdentification?: any;
  }) => void;
}

const AIItemIdentifier: React.FC<AIItemIdentifierProps> = ({
  imageFile,
  onImageChange,
  onApplyResults,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AIIdentificationResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Sync preview URL with selected image file
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      setResults(null);
      setError(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate type and size (5MB max)
      if (!file.type.startsWith('image/')) {
        setError('Unsupported file format. Please upload an image (JPG, PNG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file is too large. Maximum size allowed is 5MB.');
        return;
      }

      onImageChange(file);
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
    setResults(null);
    setError(null);
  };

  const handleIdentify = async () => {
    if (!imageFile) {
      setError('Please select an image first before requesting AI identification.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await api.post('/items/identify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.identification) {
        setResults(response.data.identification);
        setIsEditing(false);
      } else {
        setError('Could not identify item details from the image. You can still enter details manually.');
      }
    } catch (err: any) {
      console.error('AI Identification error:', err);
      setError(err.response?.data?.message || 'AI service unavailable. You can continue manual reporting.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderConfidenceBadge = (confidence: number | null, textValue: string) => {
    if (confidence === null || textValue === 'Could not identify') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          Could not identify
        </span>
      );
    }

    const percentage = Math.round(confidence * 100);

    let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (percentage < 50) {
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (percentage < 80) {
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}>
        {percentage}%
      </span>
    );
  };

  const handleFieldChange = (field: keyof AIIdentificationResult, value: string) => {
    if (!results) return;
    setResults({
      ...results,
      [field]: value,
    });
  };

  const handleApply = () => {
    if (!results) return;
    onApplyResults({
      title: results.itemName !== 'Could not identify' ? results.itemName : '',
      category: results.category,
      description: results.description,
      color: results.color !== 'Could not identify' ? results.color : '',
      brand: results.brand !== 'Could not identify' ? results.brand : '',
      model: results.model !== 'Could not identify' ? results.model : '',
      aiIdentification: {
        categoryConfidence: results.categoryConfidence,
        itemNameConfidence: results.itemNameConfidence,
        colorConfidence: results.colorConfidence,
        brandConfidence: results.brandConfidence,
        modelConfidence: results.modelConfidence,
        rawSuggestedDescription: results.description,
        timestamp: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-amber-50/30 rounded-2xl p-6 border border-amber-200/60 shadow-sm space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Sparkles className="w-5 h-5 text-amber-500 mr-2 animate-pulse" />
            Smart Item Identification
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Upload a clear photo to automatically identify the item. AI suggestions can be edited before submission.
          </p>
        </div>
        <span className="px-2.5 py-1 text-[10px] font-extrabold tracking-wider bg-amber-100 text-amber-800 rounded-full border border-amber-300 uppercase">
          AI Vision Powered
        </span>
      </div>

      {/* Image Upload & Preview Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="relative">
          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-amber-200 shadow-md group h-56 bg-gray-900 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Item Preview"
                className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-3">
                <label className="cursor-pointer bg-white/90 text-gray-800 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-white transition flex items-center">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-700 transition flex items-center"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-56 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white/80 hover:bg-amber-50/40 transition cursor-pointer p-6 text-center shadow-inner group">
              <div className="p-3 bg-amber-100 rounded-full text-amber-600 mb-3 group-hover:scale-110 transition">
                <ImageIcon className="w-8 h-8" />
              </div>
              <span className="text-sm font-bold text-gray-800">Upload Photo of Item</span>
              <span className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to 5MB</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Action Button & Disclaimer */}
        <div className="space-y-4">
          <button
            type="button"
            disabled={!imageFile || isAnalyzing}
            onClick={handleIdentify}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-600/20 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Analyzing Image with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Identify Item with AI</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 leading-relaxed bg-white/70 p-3.5 rounded-xl border border-gray-200/80">
            💡 <strong>Pro-tip:</strong> AI detection automatically identifies Category, Title, Color, Brand, Model, and Description to accelerate report filing.
          </p>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-700 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Notice:</span> {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Identification Results Display */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-amber-200/80 shadow-md p-6 space-y-6 mt-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h4 className="text-base font-extrabold text-gray-900 flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2" />
                  AI Identification Results
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  AI-generated information should be reviewed before submitting.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                {isEditing ? 'Done Editing' : 'Edit Details'}
              </button>
            </div>

            {/* Grid of Results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Category</span>
                  {renderConfidenceBadge(results.categoryConfidence, results.category)}
                </div>
                {isEditing ? (
                  <select
                    value={results.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className="w-full mt-1 p-2 text-sm font-semibold rounded-lg border border-gray-300 outline-none focus:border-amber-500"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Documents">Documents</option>
                    <option value="Keys">Keys</option>
                    <option value="Bags">Bags</option>
                    <option value="Wallets">Wallets</option>
                    <option value="Pets">Pets</option>
                    <option value="Others">Others</option>
                  </select>
                ) : (
                  <p className="text-sm font-bold text-gray-900">{results.category}</p>
                )}
              </div>

              {/* Item Type / Name */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Item Type / Name</span>
                  {renderConfidenceBadge(results.itemNameConfidence, results.itemName)}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={results.itemName}
                    onChange={(e) => handleFieldChange('itemName', e.target.value)}
                    className="w-full mt-1 p-2 text-sm font-semibold rounded-lg border border-gray-300 outline-none focus:border-amber-500"
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">{results.itemName}</p>
                )}
              </div>

              {/* Color */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Color</span>
                  {renderConfidenceBadge(results.colorConfidence, results.color)}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={results.color}
                    onChange={(e) => handleFieldChange('color', e.target.value)}
                    className="w-full mt-1 p-2 text-sm font-semibold rounded-lg border border-gray-300 outline-none focus:border-amber-500"
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">{results.color}</p>
                )}
              </div>

              {/* Brand */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Brand</span>
                  {renderConfidenceBadge(results.brandConfidence, results.brand)}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={results.brand}
                    onChange={(e) => handleFieldChange('brand', e.target.value)}
                    className="w-full mt-1 p-2 text-sm font-semibold rounded-lg border border-gray-300 outline-none focus:border-amber-500"
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">{results.brand}</p>
                )}
              </div>

              {/* Possible Model */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Possible Model</span>
                  {renderConfidenceBadge(results.modelConfidence, results.model)}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={results.model}
                    onChange={(e) => handleFieldChange('model', e.target.value)}
                    className="w-full mt-1 p-2 text-sm font-semibold rounded-lg border border-gray-300 outline-none focus:border-amber-500"
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">{results.model}</p>
                )}
              </div>

              {/* Suggested Description */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-xs font-bold text-gray-500 block">Suggested Description</span>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={results.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    className="w-full mt-1 p-2 text-sm font-semibold rounded-lg border border-gray-300 outline-none focus:border-amber-500 resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-700 italic">{results.description}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleIdentify}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition flex items-center"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Analyze Again
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#800000] hover:bg-[#600000] transition shadow-md shadow-[#800000]/20 flex items-center active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-amber-300" />
                Use These Details
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIItemIdentifier;
