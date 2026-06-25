import { fileToDataUrl } from '@/src/services/receiptImageEncode';

const RECEIPT_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp';

export type PickedReceiptImage = {
  uri: string;
  fileName: string;
};

function createReceiptFileInput(): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = RECEIPT_IMAGE_ACCEPT;
  input.style.display = 'none';
  return input;
}

export async function pickReceiptImageWeb(): Promise<PickedReceiptImage | null> {
  if (typeof document === 'undefined') {
    return null;
  }

  return await new Promise((resolve, reject) => {
    const input = createReceiptFileInput();
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener('change', () => {
      void (async () => {
        const file = input.files?.[0] ?? null;
        input.value = '';
        cleanup();

        if (!file) {
          resolve(null);
          return;
        }

        try {
          const uri = await fileToDataUrl(file);
          resolve({ uri, fileName: file.name });
        } catch (error) {
          reject(error);
        }
      })();
    });

    input.addEventListener('cancel', () => {
      input.value = '';
      cleanup();
      resolve(null);
    });

    input.click();
  });
}
