export interface Service {
  id: string | number;
  name: string;
  description: string;
  price: number;
  duration?: number;
  imageKey?: string;
  image?: string | null;
  sub_center?: string;
  category?: string;
  sector_id?: number | null;
  tenant_id?: number | null;
  tenant_name?: string | null;
}

export const getServiceImage = (key: string) => {
  // Map of image keys to local assets
  const images: Record<string, any> = {
    'premium': require('../assets/myimage/wash-premium.png'),
    'basic': require('../assets/myimage/wash-basic.png'), // Add more mappings as needed
  };
  return images[key] || images['premium'];
};
