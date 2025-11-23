import { useState } from 'react';

export function useDrawer() {
  const [open, setOpen] = useState(false);
  
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  
  return { open, setOpen, handleOpen, handleClose };
} 