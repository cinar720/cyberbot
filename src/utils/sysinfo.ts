import { execSync } from 'node:child_process';

export interface MemoryModuleInfo {
  manufacturer: string;
  partNumber: string;
  capacityBytes: number;
  speedMhz: number;
  ddrType: string | null;
}

export interface SystemMemoryInfo {
  modules: MemoryModuleInfo[];
  totalBytes: number;
}

const MEMORY_TYPE_MAP: Record<number, string> = {
  20: 'DDR',
  21: 'DDR2',
  24: 'DDR3',
  25: 'DDR4',
  26: 'DDR4',
  34: 'DDR5',
  35: 'DDR5',
};

export function getSystemMemoryInfo(): SystemMemoryInfo {
  try {
    const output = execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_PhysicalMemory | Select-Object Manufacturer,PartNumber,Capacity,ConfiguredClockSpeed,MemoryType | ConvertTo-Json -Compress"`,
      { encoding: 'utf8', windowsHide: true },
    ).trim();

    if (!output) {
      throw new Error('Empty memory info output');
    }

    const parsed = JSON.parse(output);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    const modules: MemoryModuleInfo[] = list
      .filter((mod: Record<string, unknown>) => mod && typeof mod === 'object')
      .map((mod: Record<string, unknown>) => {
        const manufacturer = String(mod.Manufacturer ?? 'Bilinmiyor').trim();
        const partNumber = String(mod.PartNumber ?? '').trim();
        const capacity = Number(mod.Capacity ?? 0);
        const speed = Number(mod.ConfiguredClockSpeed ?? mod.Speed ?? 0);
        const memoryType = Number(mod.MemoryType ?? 0);

        let ddrType: string | null = null;
        if (MEMORY_TYPE_MAP[memoryType]) {
          ddrType = MEMORY_TYPE_MAP[memoryType];
        } else if (partNumber) {
          const ddrMatch = /DDR\d?/i.exec(partNumber);
          if (ddrMatch) ddrType = ddrMatch[0].toUpperCase();
        }

        return {
          manufacturer,
          partNumber,
          capacityBytes: capacity,
          speedMhz: speed,
          ddrType,
        };
      });

    const totalBytes = modules.reduce((acc, mod) => acc + mod.capacityBytes, 0);

    return { modules, totalBytes };
  } catch {
    return { modules: [], totalBytes: 0 };
  }
}

export function formatMemoryModules(info: SystemMemoryInfo): string {
  if (info.modules.length === 0) return 'Bilinmiyor';

  return info.modules
    .map((mod) => {
      const gb = (mod.capacityBytes / 1024 ** 3).toFixed(0);
      const ddr = mod.ddrType ?? 'DDR?';
      const speed = mod.speedMhz > 0 ? ` ${mod.speedMhz}MHz` : '';
      const vendor =
        mod.manufacturer && mod.manufacturer !== 'Bilinmiyor' ? ` ${mod.manufacturer}` : '';
      return `${gb}GB ${ddr}${speed}${vendor}`;
    })
    .join(' + ');
}
