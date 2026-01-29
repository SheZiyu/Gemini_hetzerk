#!/usr/bin/env python3
"""
从 PDB 文件生成模拟的 AlphaFold 质量数据 (pLDDT + PAE)

用法:
    python scripts/generate_quality_data.py [pdb_file] [output_dir]

示例:
    python scripts/generate_quality_data.py public/mock_data/6gfs.pdb public/mock_data/
"""

import json
import math
import os
import sys
import random
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict

@dataclass
class ChainInfo:
    """链信息"""
    chainId: str
    startIndex: int
    endIndex: int
    residueCount: int
    type: str = "protein"

@dataclass
class PLDDTData:
    """pLDDT 置信度数据"""
    scores: List[float]
    residueNumbers: List[int]
    chainIds: List[str]
    averageScore: float

@dataclass
class PAEData:
    """PAE 预测对齐误差数据"""
    matrix: List[List[float]]
    maxPAE: float
    chainBoundaries: List[int]
    numResidues: int

@dataclass
class AlphaFoldQualityData:
    """完整的 AlphaFold 质量数据"""
    modelConfidence: Dict[str, float]
    plddt: PLDDTData
    pae: PAEData
    chains: List[ChainInfo]


def parse_pdb(pdb_path: str) -> Tuple[int, List[int], List[ChainInfo]]:
    """
    解析 PDB 文件，提取残基数量和链边界

    Returns:
        (num_residues, chain_boundaries, chain_infos)
    """
    chain_residues: Dict[str, set] = {}

    with open(pdb_path, 'r') as f:
        for line in f:
            if line.startswith('ATOM'):
                # PDB 格式: 列 22 是链 ID, 列 23-26 是残基序号
                chain_id = line[21:22].strip() or 'A'
                try:
                    res_seq = int(line[22:26].strip())
                except ValueError:
                    continue

                if chain_id not in chain_residues:
                    chain_residues[chain_id] = set()
                chain_residues[chain_id].add(res_seq)

    # 按链 ID 排序
    chain_ids = sorted(chain_residues.keys())

    # 计算总残基数和链边界
    total_residues = 0
    chain_boundaries: List[int] = []
    chain_infos: List[ChainInfo] = []

    for i, chain_id in enumerate(chain_ids):
        residue_count = len(chain_residues[chain_id])
        start_index = total_residues
        total_residues += residue_count
        end_index = total_residues

        chain_infos.append(ChainInfo(
            chainId=chain_id,
            startIndex=start_index,
            endIndex=end_index,
            residueCount=residue_count,
            type="protein"
        ))

        # 除最后一条链外，添加链边界
        if i < len(chain_ids) - 1:
            chain_boundaries.append(total_residues)

    return total_residues, chain_boundaries, chain_infos


def generate_plddt(num_residues: int, chain_infos: List[ChainInfo], seed: Optional[int] = None) -> PLDDTData:
    """
    生成模拟的 pLDDT 数据

    pLDDT (predicted Local Distance Difference Test) 置信度分数 (0-100)

    模拟真实 AlphaFold 预测的分布:
    - 结构域核心区域: 高置信度 (>90)
    - 二级结构区域: 中高置信度 (70-90)
    - Loop 区域: 中等置信度 (50-70)
    - N/C 末端和无序区: 低置信度 (<50)
    """
    if seed is not None:
        random.seed(seed)

    scores: List[float] = []
    residue_numbers: List[int] = []
    chain_ids: List[str] = []

    total_score = 0.0
    current_chain_index = 0

    for i in range(num_residues):
        # 确定当前残基所在的链
        while (current_chain_index < len(chain_infos) - 1 and
               i >= chain_infos[current_chain_index].endIndex):
            current_chain_index += 1

        current_chain = chain_infos[current_chain_index] if chain_infos else ChainInfo('A', 0, num_residues, num_residues)

        # 计算在链内的相对位置 (0-1)
        chain_start = current_chain.startIndex
        chain_end = current_chain.endIndex
        chain_length = chain_end - chain_start
        relative_pos = (i - chain_start) / chain_length if chain_length > 0 else 0.5

        # 基础分数 - 模拟真实分布
        if relative_pos < 0.05 or relative_pos > 0.95:
            # N端和C端区域 - 较低置信度
            base_score = 30 + random.random() * 30  # 30-60
        elif 0.2 < relative_pos < 0.8:
            # 核心区域 - 高置信度
            # 模拟二级结构的周期性
            period = math.sin(i * 0.3) * 0.5 + 0.5
            if period > 0.7:
                # α-螺旋或β-折叠核心
                base_score = 85 + random.random() * 15  # 85-100
            elif period > 0.3:
                # 常规二级结构
                base_score = 70 + random.random() * 20  # 70-90
            else:
                # Loop 区域
                base_score = 50 + random.random() * 25  # 50-75
        else:
            # 过渡区域
            base_score = 55 + random.random() * 30  # 55-85

        # 添加随机波动
        noise = (random.random() - 0.5) * 10
        final_score = max(0, min(100, base_score + noise))

        scores.append(round(final_score, 2))
        residue_numbers.append(i + 1)
        chain_ids.append(current_chain.chainId)
        total_score += final_score

    return PLDDTData(
        scores=scores,
        residueNumbers=residue_numbers,
        chainIds=chain_ids,
        averageScore=round(total_score / num_residues, 2) if num_residues > 0 else 0
    )


def generate_pae(num_residues: int, chain_boundaries: List[int], seed: Optional[int] = None) -> PAEData:
    """
    生成模拟的 PAE 数据

    PAE (Predicted Aligned Error) 表示残基间相对位置的预测误差
    值范围: 0-30 Å (越小越好)
    """
    if seed is not None:
        random.seed(seed + 1000)  # 使用不同的种子

    matrix: List[List[float]] = []
    max_pae = 0.0

    for i in range(num_residues):
        row: List[float] = []
        for j in range(num_residues):
            # 对角线上误差为0
            if i == j:
                row.append(0.0)
                continue

            # 计算基础误差 - 距离越远误差越大
            distance = abs(i - j)
            base_error = min(distance * 0.1, 15)

            # 检查是否在同一个链内
            same_chain = True
            for boundary in chain_boundaries:
                if (i < boundary <= j) or (j < boundary <= i):
                    same_chain = False
                    break

            # 不同链之间的误差更高
            if not same_chain:
                base_error = min(base_error + 8 + random.random() * 10, 30)

            # 添加结构域效应 - 某些区域内部误差低
            domain_size = 50
            domain_i = i // domain_size
            domain_j = j // domain_size

            if domain_i == domain_j:
                base_error = max(0, base_error - 5)

            # 添加随机噪声
            noise = (random.random() - 0.5) * 4
            final_error = max(0, min(30, base_error + noise))

            row.append(round(final_error, 2))
            max_pae = max(max_pae, final_error)

        matrix.append(row)

    return PAEData(
        matrix=matrix,
        maxPAE=round(max_pae, 2),
        chainBoundaries=chain_boundaries,
        numResidues=num_residues
    )


def generate_quality_data(pdb_path: str, seed: Optional[int] = 42) -> AlphaFoldQualityData:
    """
    从 PDB 文件生成完整的 AlphaFold 质量数据
    """
    # 解析 PDB
    num_residues, chain_boundaries, chain_infos = parse_pdb(pdb_path)
    print(f"Parsed PDB: {num_residues} residues, {len(chain_infos)} chain(s)")

    # 生成 pLDDT 数据
    plddt = generate_plddt(num_residues, chain_infos, seed)
    print(f"Generated pLDDT: average score = {plddt.averageScore}")

    # 生成 PAE 数据
    pae = generate_pae(num_residues, chain_boundaries, seed)
    print(f"Generated PAE: {pae.numResidues}x{pae.numResidues} matrix, max = {pae.maxPAE}")

    # 计算模型整体指标
    ptm = 0.7 + (plddt.averageScore / 100) * 0.25
    iptm = 0.5 + random.random() * 0.4 if len(chain_infos) > 1 else None

    model_confidence = {"pTM": round(ptm, 3)}
    if iptm is not None:
        model_confidence["ipTM"] = round(iptm, 3)

    return AlphaFoldQualityData(
        modelConfidence=model_confidence,
        plddt=plddt,
        pae=pae,
        chains=chain_infos
    )


def save_quality_data(quality_data: AlphaFoldQualityData, output_dir: str, pdb_id: str):
    """
    保存质量数据为 JSON 文件
    """
    os.makedirs(output_dir, exist_ok=True)

    # 转换为可序列化的字典
    def to_dict(obj):
        if hasattr(obj, '__dataclass_fields__'):
            return {k: to_dict(v) for k, v in asdict(obj).items()}
        elif isinstance(obj, list):
            return [to_dict(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: to_dict(v) for k, v in obj.items()}
        return obj

    data_dict = to_dict(quality_data)

    # 保存完整数据
    output_path = os.path.join(output_dir, f"{pdb_id}_quality_data.json")
    with open(output_path, 'w') as f:
        json.dump(data_dict, f, indent=2)
    print(f"Saved: {output_path}")

    # 单独保存 pLDDT (更小的文件，方便快速加载)
    plddt_path = os.path.join(output_dir, f"{pdb_id}_plddt.json")
    with open(plddt_path, 'w') as f:
        json.dump(to_dict(quality_data.plddt), f)
    print(f"Saved: {plddt_path}")

    # 单独保存 PAE (较大的文件)
    pae_path = os.path.join(output_dir, f"{pdb_id}_pae.json")
    with open(pae_path, 'w') as f:
        json.dump(to_dict(quality_data.pae), f)
    print(f"Saved: {pae_path}")

    return output_path


def main():
    # 默认路径
    default_pdb = "public/mock_data/6gfs.pdb"
    default_output = "public/mock_data"

    # 解析命令行参数
    pdb_path = sys.argv[1] if len(sys.argv) > 1 else default_pdb
    output_dir = sys.argv[2] if len(sys.argv) > 2 else default_output

    # 获取 PDB ID
    pdb_id = os.path.splitext(os.path.basename(pdb_path))[0]

    print(f"Processing: {pdb_path}")
    print(f"Output directory: {output_dir}")
    print(f"PDB ID: {pdb_id}")
    print("-" * 40)

    # 生成数据
    quality_data = generate_quality_data(pdb_path)

    # 保存数据
    save_quality_data(quality_data, output_dir, pdb_id)

    print("-" * 40)
    print("Done!")


if __name__ == "__main__":
    main()
