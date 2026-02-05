'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Upload,
  Microscope,
  FileText,
  CheckCircle,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface FileUploadState {
  file: File | null;
  name: string;
  status: 'empty' | 'selected' | 'error';
  error?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [proteinFile, setProteinFile] = useState<FileUploadState>({
    file: null,
    name: '',
    status: 'empty'
  });
  const [ligandFile, setLigandFile] = useState<FileUploadState>({
    file: null,
    name: '',
    status: 'empty'
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileDrop = useCallback((
    e: React.DragEvent<HTMLDivElement>,
    type: 'protein' | 'ligand'
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file, type);
  }, []);

  const handleFileSelect = (file: File | undefined, type: 'protein' | 'ligand') => {
    if (!file) return;

    const expectedExt = type === 'protein' ? '.pdb' : '.sdf';
    const isValid = file.name.toLowerCase().endsWith(expectedExt);

    const setState = type === 'protein' ? setProteinFile : setLigandFile;

    if (isValid) {
      setState({
        file,
        name: file.name,
        status: 'selected'
      });
    } else {
      setState({
        file: null,
        name: file.name,
        status: 'error',
        error: `Please upload a ${expectedExt} file`
      });
    }
  };

  const clearFile = (type: 'protein' | 'ligand') => {
    const setState = type === 'protein' ? setProteinFile : setLigandFile;
    setState({ file: null, name: '', status: 'empty' });
  };

  const handleAnalyze = async () => {
    if (!proteinFile.file || !ligandFile.file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('protein', proteinFile.file);
      formData.append('ligand', ligandFile.file);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      
      // 存储结果到 sessionStorage 并跳转到结果页
      sessionStorage.setItem('analysisResult', JSON.stringify(result));
      router.push('/results');
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Failed to analyze. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = proteinFile.status === 'selected' && ligandFile.status === 'selected';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Microscope size={22} />
          </div>
          <div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">DrugDiffusion</span>
            <span className="text-[10px] text-slate-400 ml-2 bg-slate-100 px-1.5 py-0.5 rounded">BETA</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              AI-Powered Drug Design
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-3">
              Molecular Docking Analysis
            </h1>
            <p className="text-slate-500 text-lg">
              Upload your protein structure and ligand to get AI-powered binding analysis
            </p>
          </div>

          {/* Upload Cards */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Protein Upload */}
            <div
              className={`
                relative p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer
                ${proteinFile.status === 'selected' 
                  ? 'border-green-400 bg-green-50/50' 
                  : proteinFile.status === 'error'
                  ? 'border-red-400 bg-red-50/50'
                  : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'}
              `}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleFileDrop(e, 'protein')}
              onClick={() => document.getElementById('protein-input')?.click()}
            >
              <input
                id="protein-input"
                type="file"
                accept=".pdb"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0], 'protein')}
              />
              
              <div className="text-center">
                <div className={`
                  w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center
                  ${proteinFile.status === 'selected' ? 'bg-green-100' : 'bg-indigo-100'}
                `}>
                  {proteinFile.status === 'selected' ? (
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  ) : (
                    <FileText className="w-7 h-7 text-indigo-600" />
                  )}
                </div>
                
                <h3 className="font-semibold text-slate-800 mb-1">Protein Structure</h3>
                <p className="text-sm text-slate-500 mb-3">.pdb file</p>
                
                {proteinFile.status === 'selected' ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-green-700 font-medium truncate max-w-[150px]">
                      {proteinFile.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFile('protein'); }}
                      className="p-1 hover:bg-green-200 rounded"
                    >
                      <X className="w-4 h-4 text-green-700" />
                    </button>
                  </div>
                ) : proteinFile.status === 'error' ? (
                  <p className="text-sm text-red-600">{proteinFile.error}</p>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm text-indigo-600">
                    <Upload className="w-4 h-4" />
                    <span>Drop or click to upload</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ligand Upload */}
            <div
              className={`
                relative p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer
                ${ligandFile.status === 'selected' 
                  ? 'border-green-400 bg-green-50/50' 
                  : ligandFile.status === 'error'
                  ? 'border-red-400 bg-red-50/50'
                  : 'border-slate-300 bg-white hover:border-purple-400 hover:bg-purple-50/30'}
              `}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleFileDrop(e, 'ligand')}
              onClick={() => document.getElementById('ligand-input')?.click()}
            >
              <input
                id="ligand-input"
                type="file"
                accept=".sdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0], 'ligand')}
              />
              
              <div className="text-center">
                <div className={`
                  w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center
                  ${ligandFile.status === 'selected' ? 'bg-green-100' : 'bg-purple-100'}
                `}>
                  {ligandFile.status === 'selected' ? (
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  ) : (
                    <FileText className="w-7 h-7 text-purple-600" />
                  )}
                </div>
                
                <h3 className="font-semibold text-slate-800 mb-1">Ligand Structure</h3>
                <p className="text-sm text-slate-500 mb-3">.sdf file</p>
                
                {ligandFile.status === 'selected' ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-green-700 font-medium truncate max-w-[150px]">
                      {ligandFile.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFile('ligand'); }}
                      className="p-1 hover:bg-green-200 rounded"
                    >
                      <X className="w-4 h-4 text-green-700" />
                    </button>
                  </div>
                ) : ligandFile.status === 'error' ? (
                  <p className="text-sm text-red-600">{ligandFile.error}</p>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm text-purple-600">
                    <Upload className="w-4 h-4" />
                    <span>Drop or click to upload</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className="w-full h-14 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Start Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          {/* Info */}
          <p className="text-center text-sm text-slate-400 mt-6">
            Your files will be processed by our AI agent for molecular docking analysis
          </p>
        </div>
      </main>
    </div>
  );
}
