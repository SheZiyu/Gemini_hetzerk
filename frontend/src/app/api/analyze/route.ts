import { NextRequest, NextResponse } from 'next/server';
import pako from 'pako';

// 后端API地址
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const proteinFile = formData.get('protein') as File;
    const ligandFile = formData.get('ligand') as File;
    
    if (!proteinFile || !ligandFile) {
      return NextResponse.json(
        { error: 'Both protein and ligand files are required' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const proteinContent = await proteinFile.text();
    const ligandContent = await ligandFile.text();

    // 压缩文件内容
    const proteinCompressed = pako.gzip(proteinContent);
    const ligandCompressed = pako.gzip(ligandContent);

    // 转换为 Base64 以便 JSON 传输
    const proteinBase64 = Buffer.from(proteinCompressed).toString('base64');
    const ligandBase64 = Buffer.from(ligandCompressed).toString('base64');

    // 发送到后端
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        protein: proteinBase64,
        ligand: ligandBase64,
        proteinName: proteinFile.name,
        ligandName: ligandFile.name,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
      throw new Error(errorData.error || 'Analysis failed');
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
