export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  imageKey: string;
}

export const getServiceImage = (key: string) => {
  // Map of image keys to local assets
  const images: Record<string, any> = {
    'premium': require('../assets/myimage/wash-premium.png'),
    'basic': require('../assets/myimage/wash-basic.png'), // Add more mappings as needed
  };
  return images[key] || images['premium'];
};
