declare module "cloudinary" {
  export const v2: any;
  export interface UploadApiResponse {
    secure_url: string;
    public_id: string;
  }
}
