export interface AvatarCropDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (base64: string) => Promise<void> | void;
}
