document.fonts.ready.then(() => {
    console.log('所有字体已加载完成');
});

document.addEventListener('DOMContentLoaded', function() {
    // Unsplash API 配置
    const UNSPLASH_ACCESS_KEY = 'wSP9ev4ztTjZ1_-lxjttI-Vvmshz9GBr1VOYFZnyPjI'; // 替换为您的Unsplash Access Key
    const UNSPLASH_API_URL = 'https://api.unsplash.com/photos/random?query=christian,nature,bible,animals,love,family&orientation=landscape&client_id=' + UNSPLASH_ACCESS_KEY;

    // 图片缩放控制
    let currentScale = 1;
    const maxScale = 3;
    const minScale = 0.5;
    let lastScrollPosition = { top: 0, left: 0 };

    // 图片放大函数
    function zoomIn() {
        const previewImage = document.getElementById('previewImage');
        const container = document.getElementById('imageContainer');

        if (previewImage && currentScale < maxScale) {
            // 保存当前滚动位置
            lastScrollPosition = {
                top: container.scrollTop,
                left: container.scrollLeft
            };

            // 应用缩放
            currentScale *= 1.2;
            previewImage.style.transform = `scale(${currentScale})`;

            // 调整滚动位置以保持可见区域
            setTimeout(() => {
                container.scrollTop = lastScrollPosition.top * (currentScale / (currentScale / 1.2));
                container.scrollLeft = lastScrollPosition.left * (currentScale / (currentScale / 1.2));
            }, 10);
        }
    }

    // 图片缩小函数
    function zoomOut() {
        const previewImage = document.getElementById('previewImage');
        const container = document.getElementById('imageContainer');

        if (previewImage && currentScale > minScale) {
            // 保存当前滚动位置
            lastScrollPosition = {
                top: container.scrollTop,
                left: container.scrollLeft
            };

            // 应用缩放
            currentScale /= 1.2;
            previewImage.style.transform = `scale(${currentScale})`;

            // 调整滚动位置以保持可见区域
            setTimeout(() => {
                container.scrollTop = lastScrollPosition.top * (currentScale / (currentScale * 1.2));
                container.scrollLeft = lastScrollPosition.left * (currentScale / (currentScale * 1.2));
            }, 10);
        }
    }

    // 重置缩放函数
    function resetZoom() {
        const previewImage = document.getElementById('previewImage');
        const container = document.getElementById('imageContainer');

        if (previewImage) {
            currentScale = 1;
            previewImage.style.transform = 'scale(1)';
            container.scrollTop = 0;
            container.scrollLeft = 0;
        }
    }

    // 初始化Quill富文本编辑器
    const quill = new Quill('#editor-content2', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['clean']
            ]
        },
        placeholder: '输入灵修内容...',
        bounds: '#editor-content2'
    });

    // 监听编辑器内容变化，更新隐藏的input
    quill.on('text-change', function() {
        document.getElementById('content2').value = quill.root.innerHTML;
        debouncedGenerateImage();
        debouncedSaveContent();
    });

    // 获取所有表单元素（修改为包含隐藏的content2 input）
    const formElements = [
        'title', 'date', 'content1', 'content2', 'content3', 'content4'
    ].map(id => document.getElementById(id));

    let generatedCanvas = null;
    let debounceTimer = null;
    const debounceDelay = 500; // 防抖延迟500毫秒

    // 设置当前日期为默认值
    const today = new Date();
    const dateStr = today.toISOString().substr(0, 10);
    document.getElementById('date').value = dateStr;

    // 加载保存的内容
    loadSavedContent();

    // 为所有表单元素添加输入监听（自动保存）
    formElements.forEach(element => {
        element.addEventListener('input', function() {
            debouncedGenerateImage();
            debouncedSaveContent(); // 输入时自动保存
        });
    });

    // 保存按钮事件
    saveBtn.addEventListener('click', function() {
        saveContent();
        alert('内容已保存！');
    });

    // 下载图片
    downloadBtn.addEventListener('click', function() {
        if (!generatedCanvas) {
            alert('请先生成图片');
            return;
        }

        const link = document.createElement('a');
        const dateValue = document.getElementById('date').value;
        const currentDate = dateValue ? new Date(dateValue) : new Date();

        // 获取当月第一天
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        // 计算当月第一天是星期几（0是周日，6是周六）
        const firstDayOfWeek = firstDayOfMonth.getDay();

        // 计算当前日期是当月的第几天
        const dayOfMonth = currentDate.getDate();

        // 计算周数（从1开始）
        const weekNumber = Math.floor((dayOfMonth + firstDayOfWeek - 1) / 7) + 1;

        // 获取当前是星期几（0-6，0是周日）
        let dayOfWeek = currentDate.getDay();
        // 转换为1-7（1是周日，7是周六）
        dayOfWeek = dayOfWeek === 0 ? 1 : dayOfWeek + 1;

        // 格式化为 W周数-星期几
        const fileName = `W${weekNumber}-${dayOfWeek}`;

        link.download = `${fileName}.png`;
        link.href = generatedCanvas.toDataURL('image/png');
        link.click();
    });

    // 缩放控制事件
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    resetZoomBtn.addEventListener('click', resetZoom);

    // 初始生成图片
    generateImage();

    // Unsplash 随机图片功能
    document.getElementById('unsplashImageBtn').addEventListener('click', function() {
        fetchRandomImageFromUnsplash();
    });

    // 清空Unsplash图片按钮
    document.querySelector('[data-target="unsplashImage"]').addEventListener('click', function() {
        const img = document.getElementById('unsplashImage');
        img.src = '';
        img.style.display = 'none';

        debouncedGenerateImage();
        debouncedSaveContent();
    });

    // 为所有清空按钮添加事件处理
    document.querySelectorAll('.reset-field').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            clearField(targetId);
        });
    });

    // 清空所有内容按钮
    document.getElementById('clearAllBtn').addEventListener('click', function() {
        if (confirm('确定要清空所有内容吗？')) {
            clearAllFields();
        }
    });

    // 获取Unsplash随机图片
    function fetchRandomImageFromUnsplash() {
        const unsplashImg = document.getElementById('unsplashImage');
        unsplashImg.style.display = 'none';

        // 创建加载指示器
        const loadingIndicator = document.createElement('div');
        loadingIndicator.textContent = '正在获取图片...';
        loadingIndicator.style.margin = '10px 0';
        unsplashImg.parentNode.insertBefore(loadingIndicator, unsplashImg.nextSibling);

        fetch(UNSPLASH_API_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不正常');
                }
                return response.json();
            })
            .then(data => {
                loadingIndicator.remove();
                unsplashImg.src = data.urls.regular;
                unsplashImg.style.display = 'block';
                debouncedGenerateImage();
                debouncedSaveContent();
            })
            .catch(error => {
                console.error('获取Unsplash图片失败:', error);
                loadingIndicator.textContent = '获取图片失败，请重试';
                loadingIndicator.style.color = 'red';
            });
    }

    // 清空单个字段的函数
    function clearField(fieldId) {
        switch (fieldId) {
            case 'title':
                document.getElementById('title').value = '';
                break;
            case 'date':
                document.getElementById('date').value = dateStr; // 重置为今天
                break;
            case 'content1':
                document.getElementById('content1').value = '';
                break;
            case 'content2':
                quill.setContents([]); // 清空Quill编辑器
                document.getElementById('editor-content2').value = '';
                break;
            case 'content3':
                document.getElementById('content3').value = '';
                break;
            case 'content4':
                document.getElementById('content4').value = '';
                break;
            case 'unsplashImage':
                document.getElementById('unsplashImage').src = '';
                document.getElementById('unsplashImage').style.display = 'none';
                break;
        }
        debouncedGenerateImage();
        debouncedSaveContent();
    }

    // 清空所有字段的函数
    function clearAllFields() {
        document.getElementById('title').value = '';
        document.getElementById('date').value = dateStr;
        document.getElementById('content1').value = '';
        quill.setContents([]);
        document.getElementById('content2').value = '';
        document.getElementById('content3').value = '';
        document.getElementById('content4').value = '';
        document.getElementById('unsplashImage').src = '';
        document.getElementById('unsplashImage').style.display = 'none';

        debouncedGenerateImage();
        debouncedSaveContent();
    }

    // 加载保存的内容
    function loadSavedContent() {
        const savedData = localStorage.getItem('longImageGeneratorData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                formElements.forEach(element => {
                    if (data[element.id] !== undefined) {
                        if (element.id === 'content2') {
                            quill.root.innerHTML = data[element.id];
                        } else {
                            element.value = data[element.id];
                        }
                    }
                });

                // 恢复Unsplash图片
                if (data.unsplashImage) {
                    const img = document.getElementById('unsplashImage');
                    img.src = data.unsplashImage;
                    img.style.display = 'block';
                }
            } catch (e) {
                console.error('加载保存的数据失败:', e);
            }
        }
    }

    // 保存内容到localStorage
    function saveContent() {
        const dataToSave = {};
        formElements.forEach(element => {
            dataToSave[element.id] = element.id === 'content2' ? quill.root.innerHTML : element.value;
        });

        // 添加Unsplash图片数据
        const unsplashImg = document.getElementById('unsplashImage');
        if (unsplashImg.src && unsplashImg.src !== '') {
            dataToSave.unsplashImage = unsplashImg.src;
        }

        localStorage.setItem('longImageGeneratorData', JSON.stringify(dataToSave));
    }

    // 防抖保存函数
    let saveDebounceTimer = null;

    function debouncedSaveContent() {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(saveContent, 1000);
    }

    // 防抖函数，避免频繁触发图片生成
    function debouncedGenerateImage() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(generateImage, debounceDelay);
    }

    function generateImage() {
        // 创建临时div用于生成图片
        const tempDiv = document.createElement('div');
        tempDiv.style.width = '1000px';
        tempDiv.style.padding = '80px 100px';
        tempDiv.style.boxSizing = 'border-box';
        tempDiv.style.backgroundImage = 'url(images/bg.png)';

        // 添加标题
        const title = document.getElementById('title').value;
        if (title) {
            const titleElement = document.createElement('h1');
            titleElement.textContent = '《' + title + '》';
            titleElement.style.fontFamily = '江西拙楷';
            titleElement.style.fontSize = '60px';
            titleElement.style.color = '#333';
            titleElement.style.marginBottom = '68x';
            titleElement.style.textAlign = 'left';
            tempDiv.appendChild(titleElement);
        }

        // 添加日期
        const dateValue = document.getElementById('date').value;
        if (dateValue) {
            const date = new Date(dateValue);
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const weekday = weekdays[date.getDay()];
            const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`;

            const dateElement = document.createElement('p');
            dateElement.textContent = formattedDate;
            dateElement.style.fontFamily = "'Microsoft YaHei', sans-serif";
            dateElement.style.fontSize = '34px';
            dateElement.style.color = '#666';
            dateElement.style.textAlign = 'left';
            dateElement.style.marginBottom = '60px';
            tempDiv.appendChild(dateElement);
        }

        // 添加内容段落1
        addContentParagraph(tempDiv, 'content1');

        // 添加Unsplash图片（如果有）
        const unsplashImg = document.getElementById('unsplashImage');
        if (unsplashImg.src && unsplashImg.src !== '') {
            const imgContainer = document.createElement('div');
            imgContainer.style.width = '1000px';
            imgContainer.style.margin = '0 -100px';
            imgContainer.style.padding = '0';
            imgContainer.style.overflow = 'hidden';

            const imgClone = new Image();
            imgClone.src = unsplashImg.src;
            imgClone.style.width = '1000px';
            imgClone.style.height = 'auto';
            imgClone.style.display = 'block';
            imgClone.style.margin = '0';
            imgClone.style.padding = '0';

            imgContainer.appendChild(imgClone);
            tempDiv.appendChild(imgContainer);
        }

        // 添加富文本内容（content2）
        const content2Div = document.createElement('div');
        content2Div.innerHTML = quill.root.innerHTML;
        content2Div.style.fontFamily = "变雅楷";
        content2Div.style.fontSize = '54px';
        content2Div.style.color = '#333';
        content2Div.style.lineHeight = '1.3';
        content2Div.style.marginTop = '80px';
        content2Div.style.marginBottom = '35px';
        content2Div.style.textAlign = 'justify';
        content2Div.style.textJustify = 'inter-ideograph';
        content2Div.style.letterSpacing = '-2px';
        tempDiv.appendChild(content2Div);

        // 添加分割线容器（用于控制间距）after content2
        const dividerContainer2 = document.createElement('div');
        dividerContainer2.style.margin = '80px 0 80px 0';

        // 创建分割线元素
        const divider2 = document.createElement('hr');
        divider2.style.border = 'none';
        divider2.style.height = '1.5px';
        divider2.style.backgroundColor = '#bbb';
        divider2.style.margin = '0';
        divider2.style.padding = '0';

        dividerContainer2.appendChild(divider2);
        tempDiv.appendChild(dividerContainer2);

        // 默想思量:
        const content3Title = document.createElement('div');
        content3Title.innerHTML = `
            <p style="
            font-family: 'Microsoft YaHei', sans-serif; 
            font-size: 40px; 
            font-weight:bold;
            color: #333; 
            margin: 40px 0; 
            text-align: left; 
            ">
                默想思量:
            </p>
            `;
        tempDiv.appendChild(content3Title);

        addContentParagraph(tempDiv, 'content3');

        // 添加分割线容器（用于控制间距）after content3
        const dividerContainer3 = document.createElement('div');
        dividerContainer3.style.margin = '0 0 80px 0';

        // 创建分割线元素
        const divider3 = document.createElement('hr');
        divider3.style.border = 'none';
        divider3.style.height = '1.5px';
        divider3.style.backgroundColor = '#bbb';
        divider3.style.margin = '0';
        divider3.style.padding = '0';

        dividerContainer3.appendChild(divider3);
        tempDiv.appendChild(dividerContainer3);

        // 今日麦琴读经:
        const content4Title = document.createElement('div');
        content4Title.innerHTML = `
            <p style="
            font-family: 'Microsoft YaHei', sans-serif; 
            font-size: 40px; 
            font-weight:bold;
            color: #333; 
            margin: 40px 0; 
            text-align: left; 
            ">
                今日麦琴读经:
            </p>
            `;
        tempDiv.appendChild(content4Title);

        addContentParagraph(tempDiv, 'content4');

        // 添加分割线容器（用于控制间距）after content4
        const dividerContainer4 = document.createElement('div');
        dividerContainer4.style.margin = '0 0 80px 0';

        // 创建分割线元素
        const divider4 = document.createElement('hr');
        divider4.style.border = 'none';
        divider4.style.height = '1.5px';
        divider4.style.backgroundColor = '#bbb';
        divider4.style.margin = '0';
        divider4.style.padding = '0';

        dividerContainer4.appendChild(divider4);
        tempDiv.appendChild(dividerContainer4);

        // 添加灵修说明段落
        const devotionNote = document.createElement('div');
        devotionNote.innerHTML = `
        <p style="
        font-family: 'Microsoft YaHei', sans-serif; 
        font-size: 34px; 
        color: #8b795a; 
        line-height: 1.4; 
        margin: 80px 0; 
        text-align: justify; 
        textJustify: inter-ideograph; 
        letterSpacing: -10px; 
        ">
            欢迎您每天和朋友一起灵修，彼此鼓励守望，也请您每天把此灵修材料貼在您的朋友圈，影响您朋友圈的人蒙受神的祝福。
            <br>
            <br>
            <a style="font-style:italic;
            text-align: left; ">
            教会的DNA:
            <br>
            <sup>「</sup><sub>a </sub>爱慕耶稣<sup> 路 10:27」;</sup>
            <sup>「</sup><sub>b </sub>孩子的心<sup> 太 18:3-4」;</sup><br>
            <sup>「</sup><sub>c </sub>谈论耶稣<sup> 申 6:4-9」;</sup>
            <sup>「</sup><sub>d </sub>遵行主话<sup> 雅 1:22」;</sup><br>
            <sup>「</sup><sub>e </sub>带领门徒<sup> 太 28:19-20」;</sup>
            </a>
            <br>
            <br>
            3.0的教会不需要别的，只要从DNA里真正的爱耶稣，遵祂的旨意行。愿神祝福您！
            <br>
            <br>
            林老师敬上。
        </p>
    `;
        tempDiv.appendChild(devotionNote);

        // 修改后的添加内容段落函数
        function addContentParagraph(container, contentId) {
            if (contentId === 'content2') return; // 跳过content2，已单独处理

            const content = document.getElementById(contentId).value;
            if (!content) return;

            const p = document.createElement('p');
            const contentWithBreaks = content.replace(/\n/g, '<br>');
            p.innerHTML = contentWithBreaks;

            switch (contentId) {
                case 'content1':
                    p.style.fontFamily = '变雅楷';
                    p.style.fontSize = '54px';
                    p.style.color = '#333';
                    p.style.lineHeight = '1.3';
                    p.style.marginBottom = '60px';
                    p.style.textAlign = 'justify';
                    p.style.textJustify = 'inter-ideograph';
                    p.style.letterSpacing = '-4px';
                    break;

                case 'content3':
                    // 处理content3，添加行号和悬挂对齐
                    const lines = content.split('\n');
                    let numberedContent = '';

                    lines.forEach((line, index) => {
                        if (line.trim() !== '') {
                            numberedContent += `
                                <div style="
                                    position: relative;
                                    margin-left: -20px;
                                    padding-left: 20px;
                                    box-sizing: border-box;
                                    text-indent: 0;
                                ">
                                    <span style="
                                        position: absolute;
                                        left: -50px;
                                        width: 40px;
                                        text-align: right;
                                        padding-right: 20px;
                                    ">${index + 1}.</span>
                                    ${line}
                                </div>
                            `;
                        } else {
                            numberedContent += '<div><br></div>';
                        }
                    });

                    p.innerHTML = numberedContent;
                    p.style.fontFamily = "'Microsoft YaHei', sans-serif;";
                    p.style.fontSize = '40px';
                    p.style.color = '#333';
                    p.style.lineHeight = '1.5';
                    p.style.marginBottom = '80px';
                    p.style.letterSpacing = '2px';
                    p.style.textAlign = 'left';
                    p.style.textIndent = '-80px';
                    p.style.paddingLeft = '80px';
                    p.style.boxSizing = 'border-box';
                    break;

                case 'content4':
                    p.style.fontFamily = "'Microsoft YaHei', sans-serif;";
                    p.style.fontSize = '40px';
                    p.style.color = '#333';
                    p.style.lineHeight = '1.5';
                    p.style.textAlign = 'left';
                    p.style.letterSpacing = '2px';
                    p.style.marginBottom = '80px';
                    break;
            }

            p.style.wordBreak = 'break-word';
            container.appendChild(p);
        }

        // 将临时div添加到body（不可见）
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        // 使用html2canvas生成图片
        html2canvas(tempDiv, {
            scale: 1,
            logging: false,
            useCORS: true
        }).then(canvas => {
            generatedCanvas = canvas;

            // 生成图片前显示加载中
            imageContainer.innerHTML = '<div class="loading">生成图片中...</div>';

            // 显示预览
            const img = document.createElement('img');
            img.id = 'previewImage';
            img.src = canvas.toDataURL('image/png');
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
            img.style.transformOrigin = 'center top';

            imageContainer.innerHTML = '';
            imageContainer.appendChild(img);

            // 重置缩放状态和滚动位置
            currentScale = 1;
            imageContainer.scrollTop = 0;
            imageContainer.scrollLeft = 0;

            // 移除临时div
            document.body.removeChild(tempDiv);
        });
    }
});