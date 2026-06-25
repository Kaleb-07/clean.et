export interface SectorField {
  key: string;
  label: string;
  type: 'select' | 'address' | 'boolean' | 'number' | 'text';
  required: boolean;
  options?: string[];
}

export interface RequirementSchema {
  fields: SectorField[];
}

export interface Sector {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  requirement_schema: RequirementSchema;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  sectors: Sector[];
  created_at?: string;
  updated_at?: string;
}

export const getCategoryIcon = (slug: string) => {
  const icons: Record<string, string> = {
    'car-washing': 'car-wash',
    'building-cleaning': 'office-building',
  };
  return icons[slug] || 'home';
};
