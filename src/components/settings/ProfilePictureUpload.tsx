import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog';
import { UserAvatar } from '@/src/components/ui/user-avatar';
import {
  removeProfilePicture,
  uploadProfilePicture,
  validateProfileImageFile,
} from '@/src/lib/services/storageService';
import { cn } from '@/src/lib/utils/format';

interface ProfilePictureUploadProps {
  userId: string;
  displayName: string;
  currentPhotoUrl?: string | null;
}

export function ProfilePictureUpload({
  userId,
  displayName,
  currentPhotoUrl,
}: ProfilePictureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      uploadAbortRef.current?.abort();
    };
  }, []);

  const resetPendingSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFilePicked = (file: File | undefined | null) => {
    if (!file) return;
    setErrorMsg(null);

    const validationError = validateProfileImageFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      toast.error(validationError);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const nextPreview = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(nextPreview);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilePicked(event.target.files?.[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (uploading || removing) return;
    handleFilePicked(event.dataTransfer.files?.[0]);
  };

  const openFilePicker = () => {
    if (uploading || removing) return;
    fileInputRef.current?.click();
  };

  const handleSaveUpload = async () => {
    if (!selectedFile || uploading) return;

    const controller = new AbortController();
    uploadAbortRef.current = controller;

    setErrorMsg(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      await uploadProfilePicture(
        userId,
        selectedFile,
        (percent) => {
          setUploadProgress(percent);
        },
        controller.signal
      );

      resetPendingSelection();
      toast.success('Profile picture updated.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload profile picture. Please try again.';
      setUploadProgress(0);
      setErrorMsg(message);
      toast.error(message);
    } finally {
      if (uploadAbortRef.current === controller) {
        uploadAbortRef.current = null;
      }
      setUploading(false);
    }
  };

  const handleCancelAction = () => {
    if (uploading) {
      uploadAbortRef.current?.abort();
      return;
    }
    setErrorMsg(null);
    resetPendingSelection();
  };

  const handleConfirmRemove = async () => {
    if (removing) return;
    setErrorMsg(null);
    setRemoving(true);

    try {
      await removeProfilePicture(userId);
      resetPendingSelection();
      setConfirmRemoveOpen(false);
      toast.success('Profile picture removed.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove profile picture. Please try again.';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setRemoving(false);
    }
  };

  const activeAvatarSrc = previewUrl ?? currentPhotoUrl;
  const hasSavedPhoto = Boolean(currentPhotoUrl?.trim());
  const fileSizeLabel = selectedFile
    ? `${(selectedFile.size / (1024 * 1024) >= 0.1
        ? (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB'
        : Math.max(1, Math.round(selectedFile.size / 1024)) + ' KB')}`
    : null;

  return (
    <div className="space-y-3 pb-5 border-b border-[var(--border-subtle)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">Profile Picture</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            JPG, JPEG, PNG, or WebP up to 5 MB.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        aria-label="Select profile picture image"
        className="sr-only"
      />

      <div
        role="button"
        tabIndex={uploading || removing ? -1 : 0}
        onClick={openFilePicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading && !removing) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        aria-label={hasSavedPhoto ? 'Change profile picture' : 'Upload profile picture'}
        className={cn(
          'rounded-xl border border-dashed p-4 transition-colors duration-150 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]/40',
          isDragging
            ? 'border-[#8B7CFF] bg-[#8B7CFF]/10'
            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 hover:border-[#8B7CFF]/60 hover:bg-[var(--bg-elevated)]/70',
          (uploading || removing) && 'opacity-70 cursor-not-allowed'
        )}
      >
        <div className="relative shrink-0 self-start sm:self-center">
          <UserAvatar src={activeAvatarSrc} name={displayName} size="xl" />
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#8B7CFF] text-[#0B0D12] border-2 border-[var(--bg-card)] flex items-center justify-center"
          >
            <Camera className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {selectedFile ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                Preview ready: {selectedFile.name}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {fileSizeLabel} — Click Save Picture to apply across SpendWise, or click here to choose a different file.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {hasSavedPhoto ? 'Click or drop an image to change your picture' : 'Click or drop an image to upload'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Supports selecting from your computer or mobile photo library.
              </p>
            </div>
          )}

          {uploading && (
            <div className="space-y-1 pt-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Uploading image...</span>
                <span className="font-mono-num text-[var(--text-primary)]">{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--bg-app)] overflow-hidden">
                <div
                  className="h-full bg-[#8B7CFF] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div
            className="flex flex-wrap items-center gap-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedFile ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveUpload}
                  disabled={uploading || removing}
                >
                  <Check className="w-3.5 h-3.5" />
                  {uploading
                    ? `Uploading ${uploadProgress}%`
                    : errorMsg
                      ? 'Retry Upload'
                      : 'Save Picture'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openFilePicker}
                  disabled={uploading || removing}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Choose Another
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelAction}
                  disabled={removing}
                >
                  <X className="w-3.5 h-3.5" />
                  {uploading ? 'Cancel Upload' : 'Cancel'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openFilePicker}
                  disabled={uploading || removing}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {hasSavedPhoto ? 'Change Picture' : 'Upload Image'}
                </Button>
                {hasSavedPhoto && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmRemoveOpen(true)}
                    disabled={uploading || removing}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Picture
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <p role="alert" className="text-xs text-[#F06464]">
          {errorMsg}
        </p>
      )}

      <ConfirmDialog
        open={confirmRemoveOpen}
        onClose={() => setConfirmRemoveOpen(false)}
        onConfirm={handleConfirmRemove}
        title="Remove Profile Picture"
        description="Your current profile picture will be permanently removed and your initials avatar will be shown across SpendWise."
        confirmLabel="Remove Picture"
        loading={removing}
        danger
      />
    </div>
  );
}
