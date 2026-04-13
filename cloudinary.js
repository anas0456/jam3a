// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
  cloudName: 'ds1bx7gbk',
  uploadPreset: 'anas01'
};

// Upload image to Cloudinary with optimization
async function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    // Use Cloudinary's upload API with transformations for optimization
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

    // Add transformation parameters for optimization:
    // - q_auto: automatic quality optimization
    // - f_auto: automatic format selection (webp, avif, etc.)
    // - w_720: resize to max width of 720px
    // - h_1000: max height of 1000px to maintain aspect ratio
    const optimizedUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload?q_auto,f_auto,w_720,h_1000,c_limit`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.onload = function() {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        // Store both original and optimized URLs
        resolve({
          originalUrl: response.secure_url,
          // Cloudinary will apply transformations on-the-fly when accessing the URL
          optimizedUrl: response.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_720,h_1000,c_limit/'),
          publicId: response.public_id
        });
      } else {
        reject(new Error('Upload failed'));
      }
    };
    xhr.onerror = function() {
      reject(new Error('Upload failed'));
    };
    xhr.send(formData);
  });
}

// Get optimized URL for existing image
function getOptimizedUrl(secureUrl) {
  if (!secureUrl) return '';
  // Apply optimization transformations
  return secureUrl.replace('/upload/', '/upload/q_auto,f_auto,w_720,h_1000,c_limit/');
}

// Preview image before upload
function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview = document.getElementById('image-preview');
  if (preview) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="preview">`;
    };
    reader.readAsDataURL(file);
  }
}