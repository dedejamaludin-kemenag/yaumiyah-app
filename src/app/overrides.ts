export type YaumiyahItem = {
  id?: number;
  code: string;
  name: string;
  icon?: string | null;
  input_type: "bool" | "number";
  target_min?: number | null;
  target_max?: number | null;
  weight?: number | null;
  category?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;

  display_name?: string | null;
  display_note?: string | null;
  calc_mode?: "daily" | "weekly" | "friday" | null;
};

export function applyYaumiyahOverrides(items: YaumiyahItem[]) {
  const norm = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const OV: Record<string, Partial<YaumiyahItem>> = {
    jamaah: { display_name: "Shalat Jamaah", display_note: "Min 5 kali", target_min: 5, input_type: "number" },
    shalatjamaah: { display_name: "Shalat Jamaah", display_note: "Min 5 kali", target_min: 5, input_type: "number" },
    sholatjamaah: { display_name: "Shalat Jamaah", display_note: "Min 5 kali", target_min: 5, input_type: "number" },

    dzikirbadashalat: { display_name: "Dzikir Ba'da Shalat", display_note: "Min 5 kali", target_min: 5, input_type: "number" },
    dzikirbadasalat: { display_name: "Dzikir Ba'da Shalat", display_note: "Min 5 kali", target_min: 5, input_type: "number" },

    rawatib: { display_name: "Shalat Rawatib", display_note: "Min 6 rakaat", target_min: 6, input_type: "number" },
    shalatrawatib: { display_name: "Shalat Rawatib", display_note: "Min 6 rakaat", target_min: 6, input_type: "number" },
    sholatrawatib: { display_name: "Shalat Rawatib", display_note: "Min 6 rakaat", target_min: 6, input_type: "number" },

    tahajjud: { display_name: "Tahajjud", display_note: "Min 2 rakaat", target_min: 2, input_type: "number" },
    dhuha: { display_name: "Dhuha", display_note: "Min 2 rakaat", target_min: 2, input_type: "number" },
    tilawah: { display_name: "Tilawah", display_note: "Min 1 juz", target_min: 1, input_type: "number" },

    matsurat: { display_name: "Ma'tsurat", display_note: "Min 1x", target_min: 1, input_type: "number" },
    matsurot: { display_name: "Ma'tsurat", display_note: "Min 1x", target_min: 1, input_type: "number" },

    puasa: { display_name: "Puasa", display_note: "Min 1 kali/pekan", target_min: 1, input_type: "bool", calc_mode: "weekly" },
    olahraga: { display_name: "Olahraga", display_note: "Min 1 kali/pekan", target_min: 1, input_type: "bool", calc_mode: "weekly" }
  };

  for (const it of items || []) {
    const k = norm(it.code);
    const o = OV[k];
    if (o) Object.assign(it, o);
    else if (it.input_type === "bool" && !it.display_note) it.display_note = "Ya/Tidak";
  }
  return items;
}
