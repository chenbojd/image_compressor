// 获取DOM元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const originalPreview = document.getElementById('originalPreview');
const compressedPreview = document.getElementById('compressedPreview');
const compressionSlider = document.getElementById('compressionSlider');
const compressionValue = document.getElementById('compressionValue');
const compressButton = document.getElementById('compressButton');
const selectButton = document.getElementById('selectButton');

// 添加全局变量
let currentFile = null;
let originalImage = null;

// 添加下载按钮
const downloadButton = document.createElement('button');
downloadButton.className = 'primary-button';
downloadButton.textContent = '下载文件';
downloadButton.style.display = 'none';
downloadButton.style.marginTop = '1rem';

// 将下载按钮添加到压缩预览框中
document.getElementById('compressedPreviewBox').appendChild(downloadButton);

// 文件上传处理
uploadArea.addEventListener('click', (e) => {
    // 只有当点击的不是选择按钮时才触发文件选择
    if (e.target !== selectButton && !selectButton.contains(e.target)) {
        fileInput.click();
    }
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#007AFF';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#E5E5E5';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#E5E5E5';
    handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    console.log('File selected:', e.target.files[0]); // 添加日志
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
});

// 添加选择按钮点击事件
selectButton.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡
    fileInput.click();
});

// 处理上传的文件
function handleFile(file) {
    if (!file) return;
    
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        alert('不支持的文件格式！请上传 JPG、JPEG 或 PNG 格式的图片');
        return;
    }
    
    // 检查文件大小（限制为 20MB）
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
        alert('文件太大！请上传小于 20MB 的文件');
        return;
    }

    // 清空压缩预览
    const compressedPreviewBox = document.getElementById('compressedPreviewBox');
    compressedPreviewBox.style.display = 'none';
    compressedPreview.src = '';
    document.getElementById('compressedSize').textContent = '';
    document.getElementById('compressionRatio').textContent = '';
    downloadButton.style.display = 'none';
    
    currentFile = file;
    
    // 显示文件信息
    document.getElementById('originalSize').textContent = formatFileSize(file.size);
    document.getElementById('fileFormat').textContent = file.type;
    
    // 检查文件是否需要压缩（小于等于 100KB）
    if (file.size <= 100 * 1024) { // 100KB
        alert('当前文件质量较低（小于100KB），无需压缩。');
    }
    
    // 处理图片预览
    handleImagePreview(file);
}

// 处理图片预览
async function handleImagePreview(file) {
    console.log('开始处理图片预览:', file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
        console.log('图片加载完成');
        originalImage = new Image();
        originalImage.src = e.target.result;
        originalPreview.src = e.target.result;
        previewSection.style.display = 'grid';
    };
    
    reader.onerror = (error) => {
        console.error('图片预览失败:', error);
        alert('图片预览失败，请重试！');
    };
    
    try {
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('读取文件失败:', error);
        alert('读取文件失败，请重试！');
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 修改压缩比例滑块事件
compressionSlider.addEventListener('input', async (e) => {
    compressionValue.textContent = e.target.value + '%';
    
    // 如果有当前文件且是图片，则实时预览
    if (currentFile && currentFile.type.startsWith('image/')) {
        await updateCompressedPreview();
    }
});

// 添加实时预览函数
async function updateCompressedPreview() {
    const quality = compressionSlider.value / 100;
    const options = {
        maxWidthOrHeight: 1920,
        initialQuality: quality,
        useWebWorker: false
    };
    
    try {
        // 创建压缩实例
        const compressedFile = await imageCompression(currentFile, options);
        
        // 获取压缩后的 DataURL
        const reader = new FileReader();
        const compressedDataUrl = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(compressedFile);
        });
        
        // 显示压缩预览
        document.getElementById('compressedPreviewBox').style.display = 'block';
        compressedPreview.src = compressedDataUrl;
        document.getElementById('compressedSize').textContent = formatFileSize(compressedFile.size);
        document.getElementById('compressionRatio').textContent = `${compressionSlider.value}%`;
    } catch (error) {
        console.error('预览更新失败:', error);
    }
}

// 修改压缩按钮点击事件
compressButton.addEventListener('click', async () => {
    if (!currentFile) return;
    
    try {
        // 显示加载状态
        compressButton.disabled = true;
        compressButton.textContent = '压缩中...';
        
        await compressImage();
        downloadButton.style.display = 'block';
    } catch (error) {
        console.error('压缩失败:', error);
        alert('压缩失败，请重试！');
    } finally {
        compressButton.disabled = false;
        compressButton.textContent = '开始压缩';
    }
});

// 图片压缩功能
async function compressImage() {
    const quality = compressionSlider.value / 100;
    const options = {
        maxWidthOrHeight: 1920,
        initialQuality: quality,
        useWebWorker: false
    };
    
    try {
        console.log('开始压缩图片...');
        console.log('压缩参数:', options);
        
        // 创建压缩实例
        const compressedFile = await imageCompression(currentFile, options);
        console.log('压缩完成，压缩后文件大小:', compressedFile.size);
        
        // 获取压缩后的 DataURL
        const reader = new FileReader();
        const compressedDataUrl = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(compressedFile);
        });
        
        // 显示压缩预览
        const compressedPreviewBox = document.getElementById('compressedPreviewBox');
        compressedPreviewBox.style.display = 'block';
        compressedPreview.src = compressedDataUrl;
        
        // 更新压缩信息
        document.getElementById('compressedSize').textContent = formatFileSize(compressedFile.size);
        document.getElementById('compressionRatio').textContent = `${compressionSlider.value}%`;
        
        // 设置下载按钮
        downloadButton.onclick = () => {
            const link = document.createElement('a');
            link.href = compressedDataUrl;
            link.download = `compressed_${currentFile.name}`;
            link.click();
        };
        
        console.log('压缩预览已更新');
    } catch (error) {
        console.error('压缩过程中出错:', error);
        throw new Error('图片压缩失败: ' + error.message);
    }
} 