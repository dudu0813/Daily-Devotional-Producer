document.addEventListener('DOMContentLoaded', function() {
    // 获取所有必需的元素
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const yearInput = document.getElementById('yearInput');
    const monthInput = document.getElementById('monthInput');
    const articlesInput = document.getElementById('articlesInput');
    const articleCountSpan = document.getElementById('articleCount');
    const downloadBtn = document.getElementById('downloadBtn');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomResetBtn = document.getElementById('zoomReset');
    const zoomLevelSpan = document.getElementById('zoomLevel');
    const zoom100Btn = document.getElementById('zoom100');
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    const previewContainer = document.querySelector('.preview-container');
    const previewPanel = document.querySelector('.preview-panel');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');

    let bgImage = null;
    let currentZoom = 1.0; // 当前缩放比例
    const minZoom = 0.3; // 最小缩放30%
    const maxZoom = 1.5; // 最大缩放150%
    const zoomStep = 0.1; // 缩放步长10%

    // 月份到数字的映射
    const monthMap = {
        '一月': 1,
        '二月': 2,
        '三月': 3,
        '四月': 4,
        '五月': 5,
        '六月': 6,
        '七月': 7,
        '八月': 8,
        '九月': 9,
        '十月': 10,
        '十一月': 11,
        '十二月': 12
    };

    // 每个月的天数（非闰年）
    const monthDays = {
        1: 31,
        2: 28,
        3: 31,
        4: 30,
        5: 31,
        6: 30,
        7: 31,
        8: 31,
        9: 30,
        10: 31,
        11: 30,
        12: 31
    };

    // 修正图片压缩函数 - 使用JPEG格式
    function compressImage(canvas, quality = 0.8, maxSizeMB = 1.2, callback) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        // 初始压缩
        canvas.toBlob(function(blob) {
            // 如果已经小于目标大小，直接返回
            if (blob.size <= maxSizeBytes) {
                callback(blob);
                return;
            }

            // 否则逐步降低质量直到满足大小要求
            let currentQuality = quality;
            const minQuality = 0.3; // 最低质量30%
            const step = 0.1;

            function tryCompress() {
                if (currentQuality < minQuality) {
                    // 即使最低质量也太大，使用最低质量
                    canvas.toBlob(function(finalBlob) {
                        callback(finalBlob);
                    }, 'image/jpeg', minQuality);
                    return;
                }

                canvas.toBlob(function(blob) {
                    if (blob.size <= maxSizeBytes || currentQuality <= minQuality) {
                        callback(blob);
                    } else {
                        currentQuality -= step;
                        tryCompress();
                    }
                }, 'image/jpeg', currentQuality);
            }

            tryCompress();
        }, 'image/jpeg', quality);
    }


    // 数据存储和加载功能
    function saveData() {
        const data = {
            year: yearInput.value,
            month: monthInput.value,
            articles: articlesInput.value
        };
        localStorage.setItem('devotionalMenuData', JSON.stringify(data));

        // 显示保存成功提示
        showMessage('数据已保存！', 'success');
        console.log('数据已保存到本地存储');
    }

    function loadData() {
        const savedData = localStorage.getItem('devotionalMenuData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                yearInput.value = data.year || '2026';
                monthInput.value = data.month || '一月';
                articlesInput.value = data.articles || '';

                console.log('已加载保存的数据');
                updateArticleCount();
                updatePreview();
            } catch (error) {
                console.error('加载保存的数据失败:', error);
                // 如果加载失败，清除损坏的数据
                localStorage.removeItem('devotionalMenuData');
            }
        }
    }

    function clearData() {
        if (confirm('确定要清空所有数据吗？此操作不可撤销！')) {
            // 重置为默认值
            yearInput.value = '2026';
            monthInput.value = '一月';
            articlesInput.value = '';

            // 清除本地存储
            localStorage.removeItem('devotionalMenuData');

            // 更新界面
            updateArticleCount();
            updatePreview();

            // 显示清空成功提示
            showMessage('数据已清空！', 'info');
            console.log('数据已清空');
        }
    }

    // 显示消息提示
    function showMessage(message, type = 'info') {
        // 移除已存在的消息
        const existingMessage = document.querySelector('.message-toast');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 创建新消息
        const messageEl = document.createElement('div');
        messageEl.className = `message-toast message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

        if (type === 'success') {
            messageEl.style.background = '#28a745';
        } else if (type === 'info') {
            messageEl.style.background = '#17a2b8';
        } else {
            messageEl.style.background = '#6c757d';
        }

        document.body.appendChild(messageEl);

        // 3秒后自动消失
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => messageEl.remove(), 300);
            }
        }, 3000);
    }


    // 计算自适应缩放比例
    function calculateAutoZoom() {
        const containerWidth = previewContainer.clientWidth - 40; // 减去边距
        const containerHeight = previewContainer.clientHeight - 40; // 减去边距

        const widthRatio = containerWidth / 1000; // canvas固定宽度1000
        const heightRatio = containerHeight / canvas.height;

        // 取较小的比例，确保图片完全显示在容器内
        const autoZoom = Math.min(widthRatio, heightRatio);

        // 确保在最小和最大缩放范围内
        return Math.max(minZoom, Math.min(autoZoom, maxZoom));
    }

    // 初始化缩放
    function initZoom() {
        currentZoom = calculateAutoZoom();
        updateZoomDisplay();
    }

    // 更新缩放显示
    function updateZoomDisplay() {
        const scale = currentZoom;

        // 设置canvas和内容的缩放
        canvasWrapper.style.transform = `scale(${scale})`;
        canvasWrapper.style.width = '1000px';
        canvasWrapper.style.height = `${canvas.height}px`; // 使用原始高度，缩放由transform控制

        // 更新缩放显示
        zoomLevelSpan.textContent = `${Math.round(scale * 100)}%`;

        // 重新居中显示
        centerPreview();

        // 更新预览容器滚动条
        updatePreviewContainerHeight();
    }

    // 水平居中显示预览内容
    function centerPreview() {
        const scale = currentZoom;
        const scaledWidth = 1000 * scale;
        const containerWidth = previewContainer.clientWidth;

        // 计算水平居中位置
        if (scaledWidth < containerWidth) {
            const leftMargin = (containerWidth - scaledWidth) / 2;
            canvasWrapper.style.marginLeft = `${leftMargin}px`;
            canvasWrapper.style.marginRight = `${leftMargin}px`;
        } else {
            canvasWrapper.style.marginLeft = '0';
            canvasWrapper.style.marginRight = '0';
        }

        // 确保内容顶部对齐
        canvasWrapper.style.alignSelf = 'flex-start';
        previewContainer.scrollTop = 0;

        // 强制滚动到顶部
        previewContainer.scrollTop = 0;
    }

    // 更新预览容器高度和滚动条
    function updatePreviewContainerHeight() {
        const scale = currentZoom;
        const scaledHeight = canvas.height * scale;
        const scaledWidth = 1000 * scale;

        // 如果缩放后内容大于容器，显示滚动条
        const containerHeight = previewContainer.clientHeight;
        const containerWidth = previewContainer.clientWidth;

        if (scaledHeight > containerHeight || scaledWidth > containerWidth) {
            previewContainer.style.overflow = 'auto';
        } else {
            previewContainer.style.overflow = 'hidden';
        }
    }

    // 放大
    function zoomIn() {
        const newZoom = Math.min(currentZoom + zoomStep, maxZoom);
        if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            updateZoomDisplay();
        }
    }

    // 缩小
    function zoomOut() {
        const newZoom = Math.max(currentZoom - zoomStep, minZoom);
        if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            updateZoomDisplay();
        }
    }

    // 在缩放控制部分添加100%缩放功能
    function zoom100() {
        currentZoom = 1.0; // 100%
        updateZoomDisplay();
    }

    // 重置缩放为自适应
    function resetZoom() {
        currentZoom = calculateAutoZoom(); // 重置为自适应
        updateZoomDisplay();
    }

    // 窗口大小改变时重新计算自适应缩放
    window.addEventListener('resize', function() {
        // 延迟执行确保DOM更新完成
        setTimeout(() => {
            // 如果当前是自适应状态，重新计算缩放
            const autoZoom = calculateAutoZoom();
            if (Math.abs(currentZoom - autoZoom) < 0.05) { // 容差范围内认为是自适应状态
                currentZoom = autoZoom;
            }
            updateZoomDisplay();
        }, 100);
    });

    // 缩放事件监听
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    zoomResetBtn.addEventListener('click', resetZoom);
    zoom100Btn.addEventListener('click', zoom100); // 添加这行

    // 更新行号显示
    function updateLineNumbers() {
        const textarea = articlesInput;
        const lineNumbers = document.getElementById('lineNumbers');
        const lines = textarea.value.split('\n');

        let numbersHTML = '';
        for (let i = 1; i <= Math.max(lines.length, 1); i++) {
            numbersHTML += `<div>${i}</div>`;
        }

        lineNumbers.innerHTML = numbersHTML;

        // 同步滚动
        lineNumbers.scrollTop = textarea.scrollTop;
    }

    // 初始化行号功能
    function initLineNumbers() {
        const textarea = articlesInput;
        const lineNumbers = document.getElementById('lineNumbers');

        // 初始更新
        updateLineNumbers();

        // 监听输入事件
        textarea.addEventListener('input', updateLineNumbers);

        // 监听滚动事件
        textarea.addEventListener('scroll', function() {
            lineNumbers.scrollTop = textarea.scrollTop;
        });

        // 监听键盘事件，处理退格键等
        textarea.addEventListener('keydown', function(e) {
            // 延迟更新以确保内容已改变
            setTimeout(updateLineNumbers, 0);
        });
    }

    // 在init函数中添加对文章输入框高度的自适应
    async function init() {
        try {
            await loadBackgroundImage();
        } catch (error) {
            console.error('背景图片加载失败:', error);
        }

        // 设置默认月份
        monthInput.value = '一月';

        // 等待字体加载
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
            console.log('所有字体加载完成');
        }

        // 加载保存的数据
        loadData();

        // 延迟初始化，确保DOM完全渲染
        setTimeout(() => {
            updateArticleCount();
            updatePreview();
        }, 200);

        // 添加文章输入框自动调整高度
        autoResizeTextarea(articlesInput);

        // 初始化行号功能
        initLineNumbers();
    }

    // 自动调整文本域高度函数
    function autoResizeTextarea(textarea) {
        function resize() {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }

        // 初始调整
        resize();

        // 输入时调整
        textarea.addEventListener('input', resize);
    }

    // 加载背景图片
    function loadBackgroundImage() {
        return new Promise((resolve, reject) => {
            bgImage = new Image();
            bgImage.crossOrigin = "anonymous";
            bgImage.src = 'images/bg.png';

            bgImage.onload = function() {
                console.log('背景图片加载成功');
                resolve(bgImage);
            };

            bgImage.onerror = function() {
                console.error('背景图片加载失败，使用默认背景');
                reject(new Error('图片加载失败'));
            };
        });
    }

    // 根据年份和月份生成日期列表
    function generateDateList(year, monthName) {
        const dates = [];
        const month = monthMap[monthName];

        if (!month) {
            console.error('无效的月份:', monthName);
            return dates;
        }

        const yearNum = parseInt(year) || 2026;
        const daysInMonth = getDaysInMonth(yearNum, month);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(yearNum, month - 1, day);
            dates.push(date);
        }

        return dates;
    }

    // 获取某年某月的天数（考虑闰年）
    function getDaysInMonth(year, month) {
        // 二月需要特殊处理（闰年）
        if (month === 2) {
            return isLeapYear(year) ? 29 : 28;
        }
        return monthDays[month];
    }

    // 判断是否为闰年
    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    // 格式化日期显示
    function formatDateForDisplay(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // 获取星期几
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        let weekday = weekdays[date.getDay()];

        // 周日用"主日"代替
        if (weekday === '日') {
            weekday = '主日';
        } else {
            weekday = `周${weekday}`;
        }

        return `${year}年${month}月${day}日  ${weekday}`;
    }

    // 更新文章数量
    function updateArticleCount() {
        const articles = articlesInput.value.split('\n').filter(line => line.trim() !== '');
        articleCountSpan.textContent = articles.length;
    }

    // 开始初始化
    init();



    // 输入框实时更新预览
    [yearInput, monthInput, articlesInput].forEach(input => {
        input.addEventListener('input', function() {
            if (input === articlesInput) {
                updateArticleCount();
            }
            updatePreview();
        });
    });

    // 下载图片
    downloadBtn.addEventListener('click', downloadImage);
    saveBtn.addEventListener('click', saveData);
    clearBtn.addEventListener('click', clearData);


    // 绘制平铺背景
    function drawTiledBackground(context, width, height) {
        if (bgImage && bgImage.complete && bgImage.naturalWidth !== 0) {
            try {
                const pattern = context.createPattern(bgImage, 'repeat');
                if (pattern) {
                    context.fillStyle = pattern;
                    context.fillRect(0, 0, width, height);
                    return true;
                }
            } catch (error) {
                console.error('创建平铺图案失败:', error);
            }
        }

        context.fillStyle = '#F5F5DC';
        context.fillRect(0, 0, width, height);
        return false;
    }

    // 在updatePreview()函数中，找到高度计算的部分，替换为：

    // 更新预览内容 - 重新绘制Canvas
    function updatePreview() {
        // 准确计算Canvas高度
        const articles = articlesInput.value.split('\n').filter(line => line.trim() !== '');
        const articleCount = articles.length;

        // 重新计算高度：
        // 顶部leaf1图片高度127px + 图片到标题间距60px
        const topLeafHeight = 127 + 60;

        // 标题区域：主标题52px + 主副标题间距15px + 副标题78px + 标题与内容间距40px
        const headerHeight = 52 + 15 + 78 + 40;

        // 每篇文章高度：文章标题40px + 标题与日期间距10px + 日期30px + 文章间距60px
        const articleHeight = 40 + 10 + 30 + 60;

        // 计算周数（每周从周日开始）
        const dateList = generateDateList(yearInput.value || '2026', monthInput.value || '一月');
        let weekCount = 0;
        for (let i = 0; i < articles.length; i++) {
            const date = dateList[i];
            if (i === 0 || (date && date.getDay() === 0)) {
                weekCount++;
            }
        }

        // 修正周标题区域高度计算（使用分割线高度35px）：
        // 第一周：分割线高度35px + 分割线到周标题间距40px + 周标题30px + 周标题到内容间距50px = 155px
        // 后续周：分割线到上一周最后一行间距35px + 分割线高度35px + 分割线到周标题间距40px + 周标题30px + 周标题到内容间距50px = 190px
        const lineImgHeight = 35; // 分割线高度
        let weekTitleHeight = 0;

        if (weekCount > 0) {
            // 第一周
            weekTitleHeight = lineImgHeight + 40 + 30 + 50; // 155px

            // 后续周（如果有）
            if (weekCount > 1) {
                weekTitleHeight += (weekCount - 1) * (35 + lineImgHeight + 40 + 30 + 50); // 每增加一周加190px
            }
        }

        // 底部区域高度计算：
        const bottomLineHeight = 35; // line.png高度
        const articleSectionHeight = 45 * 10 + 20; // 文章段落大约10行，每行45px，加上"林老师敬上"的20px间距
        const leaf2Height = 128; // leaf2.png高度

        // 间距：line上方40px + line到文章40px + 文章到leaf2 40px
        const bottomSpacing = 40 + 40 + 40;

        const bottomSectionHeight = bottomLineHeight + articleSectionHeight + leaf2Height + bottomSpacing;

        // 总高度 = 顶部图片区域 + 标题区域 + (文章数量 × 每篇文章高度) + 周标题总高度 + 底部区域 + 额外边距
        const contentHeight = topLeafHeight + headerHeight + (articleCount * articleHeight) + weekTitleHeight + bottomSectionHeight + 120;

        // 设置最小高度为1200px，确保有足够的基础空间
        const finalHeight = Math.max(1200, contentHeight);

        // 更新Canvas高度
        canvas.height = finalHeight;

        console.log('Canvas高度计算:', {
            文章数量: articleCount,
            周数: weekCount,
            顶部图片区域: topLeafHeight,
            标题区域: headerHeight,
            单篇文章高度: articleHeight,
            周标题总高度: weekTitleHeight,
            底部区域: bottomSectionHeight,
            总高度: contentHeight,
            最终高度: finalHeight
        });

        // 重新绘制完整预览
        drawPreview();

        // 重新计算自适应缩放
        currentZoom = calculateAutoZoom();

        // 更新缩放显示
        updateZoomDisplay();
    }

    // 更新绘制完整预览内容到Canvas
    function drawPreview() {
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // 绘制背景
        drawTiledBackground(ctx, width, height);

        // 获取数据
        const year = yearInput.value || '2026';
        const month = monthInput.value || '一月';
        const articles = articlesInput.value.split('\n').filter(line => line.trim() !== '');

        // 根据年份和月份生成日期列表
        const dateList = generateDateList(year, month);

        // 预加载所有图片
        const leaf1Img = new Image();
        leaf1Img.src = 'images/leaf1.png';
        const leaf2Img = new Image();
        leaf2Img.src = 'images/leaf2.png';
        const lineImg = new Image();
        lineImg.src = 'images/line.png';
        const borderImg = new Image(); // 新增边框图片
        borderImg.src = 'images/border.png'; // 边框切图

        // 在图片加载完成后绘制所有内容
        Promise.all([
            new Promise(resolve => { leaf1Img.onload = resolve; }),
            new Promise(resolve => { leaf2Img.onload = resolve; }),
            new Promise(resolve => { lineImg.onload = resolve; }),
            new Promise(resolve => { borderImg.onload = resolve; }) // 等待边框图片加载
        ]).then(() => {
            // 重新绘制背景
            drawTiledBackground(ctx, width, height);

            // 绘制边框装饰
            drawBorderDecoration(ctx, width, height, borderImg);

            let yPos = 135;

            // 绘制顶部leaf1图片（距离顶部0px，距离标题60px）
            const leaf1X = (width - leaf1Img.width) / 2;
            ctx.drawImage(leaf1Img, leaf1X, yPos);
            yPos += leaf1Img.height + 60; // 图片高度127px + 间距60px

            // 绘制主标题
            const mainTitleText = `约伯之家${year} 年每日灵修`;
            ctx.fillStyle = '#251a10';
            ctx.font = '52px "STLiti", "华文隶书", "LiSu", "SimLi", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.letterSpacing = '1px';
            ctx.fillText(mainTitleText, width / 2, yPos);

            // 绘制副标题
            const subTitleText = `${month}目录`;
            ctx.fillStyle = '#251a10';
            ctx.font = '78px "STLiti", "华文隶书", "LiSu", "SimLi", Arial, sans-serif';
            ctx.letterSpacing = '3px';
            ctx.fillText(subTitleText, width / 2, yPos + 52 + 15); // 主标题高度52px + 间距15px

            // 重置字间距
            ctx.letterSpacing = '0px';

            // 文章内容起始位置：标题区域底部 + 内容间距
            yPos += 52 + 15 + 78 + 40; // 主标题52px + 间距15px + 副标题78px + 内容间距40px

            // 按周分组
            let week = 0;
            let lastArticleBottom = 0;

            for (let i = 0; i < articles.length; i++) {
                const date = dateList[i];
                const article = articles[i];

                // 如果是周日或者是第一篇文章，开始新的一周
                if (i === 0 || (date && date.getDay() === 0)) {
                    week++;

                    // 如果不是第一周，在上一篇文章底部和分割线之间留35px间距
                    if (i > 0) {
                        yPos = lastArticleBottom + 35;
                    }

                    // 绘制分割线
                    const lineX = (width - lineImg.width) / 2;
                    const lineY = yPos;
                    ctx.drawImage(lineImg, lineX, lineY);

                    // 分割线到周标题的间距40px
                    yPos += lineImg.height + 40;

                    // 绘制周数标题
                    ctx.fillStyle = '#251a10';
                    ctx.font = '30px "TW-Kai", "华文隶书", "LiSu", "SimLi", Arial, sans-serif';
                    ctx.letterSpacing = '0px';
                    const weekText = `第${week}周`;
                    ctx.fillText(weekText, width / 2, yPos);

                    // 周标题到第一篇文章的间距
                    yPos += 30 + 50; // 周标题高度30px + 间距50px
                }

                const articleWithQuotes = `《${article}》`;

                // 绘制文章标题（字间距-2px）
                ctx.fillStyle = '#251a10';
                ctx.font = '40px "TW-Kai", "BiauKai", "楷体", "KaiTi", Arial, sans-serif';
                ctx.letterSpacing = '-2px';
                ctx.fillText(articleWithQuotes, width / 2, yPos);

                // 绘制日期
                ctx.fillStyle = '#a10000';
                ctx.font = '30px "TW-Kai", "BiauKai", "楷体", "KaiTi", Arial, sans-serif';
                ctx.letterSpacing = '0px';
                ctx.fillText(date ? formatDateForDisplay(date) : '', width / 2, yPos + 40 + 10);

                // 记录当前文章的底部位置（日期底部）
                lastArticleBottom = yPos + 40 + 10 + 30;

                // 移动到下一篇文章位置
                yPos += 40 + 10 + 30 + 60;
            }

            // 在底部添加额外的文章段落和装饰
            // 先添加line.png，距离上方内容40px
            const lineX = (width - lineImg.width) / 2;
            const lineY = yPos + 0; // 距离上方内容40px
            ctx.drawImage(lineImg, lineX, lineY);

            // 添加文章段落，距离line.png 40px
            const articleY = lineY + lineImg.height + 70;
            ctx.fillStyle = '#9a601c';
            ctx.font = '30px "TW-Kai", "BiauKai", "楷体", "KaiTi", Arial, sans-serif';
            ctx.letterSpacing = '0px';
            ctx.textAlign = 'left';

            // 文章内容
            const articleContent = [
                "欢迎您每天和朋友一起灵修，彼此鼓励守望，也请您每天把此灵修材料贴在您的朋友圈，影响您朋友圈的人蒙受神的祝福。",
                "教会的 DNA：",
                "a.爱慕耶稣（路10:27）;",
                "b.孩子的心（太18:3-4）;",
                "c.谈论耶稣（申6:4-9）;",
                "d.遵行主话（雅1:22）;",
                "e.带领门徒（太28:19-20）。",
                "3.0的家教会不需要别的，只要从DNA里真正的爱耶稣行道，遵祂的旨意行。 愿神祝福您！"
            ];

            // 设置段落格式
            const lineHeight = 45; // 行高
            const maxWidth = 800; // 最大宽度
            const startX = (width - maxWidth) / 2; // 起始X坐标（居中显示）
            const indent = 60; // 首行缩进2字符（约60px）

            // 绘制文章内容
            let currentY = articleY;
            articleContent.forEach((line, index) => {
                let xPos = startX + indent; // 所有行都应用首行缩进

                // 处理长文本自动换行
                const words = line.split('');
                let currentLine = '';

                for (let i = 0; i < words.length; i++) {
                    const testLine = currentLine + words[i];
                    const metrics = ctx.measureText(testLine);

                    if (metrics.width > (maxWidth - indent) && currentLine !== '') {
                        // 绘制当前行
                        ctx.fillText(currentLine, xPos, currentY);
                        currentY += lineHeight;
                        currentLine = words[i];
                        xPos = startX; // 后续行取消缩进
                    } else {
                        currentLine = testLine;
                    }
                }

                // 绘制最后一行
                if (currentLine !== '') {
                    ctx.fillText(currentLine, xPos, currentY);
                    currentY += lineHeight;
                }
            });

            // 绘制"林老师敬上" - 居中显示
            ctx.textAlign = 'center';
            ctx.fillText('林老师敬上', width / 2, currentY + 20);

            // 恢复文本对齐方式
            ctx.textAlign = 'center';

            // 绘制底部leaf2图片，距离最后一行文字40px
            const leaf2X = (width - leaf2Img.width) / 2;
            const leaf2Y = currentY + 20 + 100; // "林老师敬上"高度 + 间距100px
            ctx.drawImage(leaf2Img, leaf2X, leaf2Y);

            // 重置字间距
            ctx.letterSpacing = '0px';

            console.log('绘制完成，最后Y位置:', yPos, 'Canvas高度:', height);
        });

        // 如果图片已经缓存，手动触发绘制
        if (leaf1Img.complete && leaf2Img.complete && lineImg.complete && borderImg.complete) {
            leaf1Img.onload();
            leaf2Img.onload();
            lineImg.onload();
            borderImg.onload();
        }


    }

    // 新增边框绘制函数
    function drawBorderDecoration(context, width, height, borderImage) {
        const cornerSize = 128; // 四个角的固定大小
        const borderMargin = 20; // 边框距离边缘的边距

        // 源图片是261px正方形，四个角的128px区域
        const sourceSize = 261;

        // 四个角的源坐标
        const sourceCorners = {
            topLeft: { x: 0, y: 0, width: cornerSize, height: cornerSize },
            topRight: { x: sourceSize - cornerSize, y: 0, width: cornerSize, height: cornerSize },
            bottomLeft: { x: 0, y: sourceSize - cornerSize, width: cornerSize, height: cornerSize },
            bottomRight: { x: sourceSize - cornerSize, y: sourceSize - cornerSize, width: cornerSize, height: cornerSize }
        };

        // 目标坐标
        const targetCorners = {
            topLeft: { x: borderMargin, y: borderMargin, width: cornerSize, height: cornerSize },
            topRight: { x: width - borderMargin - cornerSize, y: borderMargin, width: cornerSize, height: cornerSize },
            bottomLeft: { x: borderMargin, y: height - borderMargin - cornerSize, width: cornerSize, height: cornerSize },
            bottomRight: { x: width - borderMargin - cornerSize, y: height - borderMargin - cornerSize, width: cornerSize, height: cornerSize }
        };

        // 绘制四个角
        // 左上角
        context.drawImage(
            borderImage,
            sourceCorners.topLeft.x, sourceCorners.topLeft.y, sourceCorners.topLeft.width, sourceCorners.topLeft.height,
            targetCorners.topLeft.x, targetCorners.topLeft.y, targetCorners.topLeft.width, targetCorners.topLeft.height
        );

        // 右上角
        context.drawImage(
            borderImage,
            sourceCorners.topRight.x, sourceCorners.topRight.y, sourceCorners.topRight.width, sourceCorners.topRight.height,
            targetCorners.topRight.x, targetCorners.topRight.y, targetCorners.topRight.width, targetCorners.topRight.height
        );

        // 左下角
        context.drawImage(
            borderImage,
            sourceCorners.bottomLeft.x, sourceCorners.bottomLeft.y, sourceCorners.bottomLeft.width, sourceCorners.bottomLeft.height,
            targetCorners.bottomLeft.x, targetCorners.bottomLeft.y, targetCorners.bottomLeft.width, targetCorners.bottomLeft.height
        );

        // 右下角
        context.drawImage(
            borderImage,
            sourceCorners.bottomRight.x, sourceCorners.bottomRight.y, sourceCorners.bottomRight.width, sourceCorners.bottomRight.height,
            targetCorners.bottomRight.x, targetCorners.bottomRight.y, targetCorners.bottomRight.width, targetCorners.bottomRight.height
        );

        // 绘制四条边（拉伸中间部分）
        const edgeThickness = 20; // 边的厚度

        // 上边
        const topEdgeSourceX = cornerSize;
        const topEdgeSourceY = 0;
        const topEdgeSourceWidth = sourceSize - 2 * cornerSize;
        const topEdgeSourceHeight = edgeThickness;

        const topEdgeTargetX = borderMargin + cornerSize;
        const topEdgeTargetY = borderMargin;
        const topEdgeTargetWidth = width - 2 * (borderMargin + cornerSize);
        const topEdgeTargetHeight = edgeThickness;

        context.drawImage(
            borderImage,
            topEdgeSourceX, topEdgeSourceY, topEdgeSourceWidth, topEdgeSourceHeight,
            topEdgeTargetX, topEdgeTargetY, topEdgeTargetWidth, topEdgeTargetHeight
        );

        // 下边
        const bottomEdgeSourceX = cornerSize;
        const bottomEdgeSourceY = sourceSize - edgeThickness;
        const bottomEdgeSourceWidth = sourceSize - 2 * cornerSize;
        const bottomEdgeSourceHeight = edgeThickness;

        const bottomEdgeTargetX = borderMargin + cornerSize;
        const bottomEdgeTargetY = height - borderMargin - edgeThickness;
        const bottomEdgeTargetWidth = width - 2 * (borderMargin + cornerSize);
        const bottomEdgeTargetHeight = edgeThickness;

        context.drawImage(
            borderImage,
            bottomEdgeSourceX, bottomEdgeSourceY, bottomEdgeSourceWidth, bottomEdgeSourceHeight,
            bottomEdgeTargetX, bottomEdgeTargetY, bottomEdgeTargetWidth, bottomEdgeTargetHeight
        );

        // 左边
        const leftEdgeSourceX = 0;
        const leftEdgeSourceY = cornerSize;
        const leftEdgeSourceWidth = edgeThickness;
        const leftEdgeSourceHeight = sourceSize - 2 * cornerSize;

        const leftEdgeTargetX = borderMargin;
        const leftEdgeTargetY = borderMargin + cornerSize;
        const leftEdgeTargetWidth = edgeThickness;
        const leftEdgeTargetHeight = height - 2 * (borderMargin + cornerSize);

        context.drawImage(
            borderImage,
            leftEdgeSourceX, leftEdgeSourceY, leftEdgeSourceWidth, leftEdgeSourceHeight,
            leftEdgeTargetX, leftEdgeTargetY, leftEdgeTargetWidth, leftEdgeTargetHeight
        );

        // 右边
        const rightEdgeSourceX = sourceSize - edgeThickness;
        const rightEdgeSourceY = cornerSize;
        const rightEdgeSourceWidth = edgeThickness;
        const rightEdgeSourceHeight = sourceSize - 2 * cornerSize;

        const rightEdgeTargetX = width - borderMargin - edgeThickness;
        const rightEdgeTargetY = borderMargin + cornerSize;
        const rightEdgeTargetWidth = edgeThickness;
        const rightEdgeTargetHeight = height - 2 * (borderMargin + cornerSize);

        context.drawImage(
            borderImage,
            rightEdgeSourceX, rightEdgeSourceY, rightEdgeSourceWidth, rightEdgeSourceHeight,
            rightEdgeTargetX, rightEdgeTargetY, rightEdgeTargetWidth, rightEdgeTargetHeight
        );
    }



    // 修改下载按钮的事件处理
    function downloadImage() {
        const canvas = document.getElementById('previewCanvas');

        // 显示压缩提示
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = '压缩中...';
        downloadBtn.disabled = true;

        // 压缩图片
        compressImage(canvas, 0.8, 1.2, function(compressedBlob) {
            // 创建下载链接
            const url = URL.createObjectURL(compressedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `约伯之家${yearInput.value || '2026'}年${monthInput.value || '一月'}灵修目录.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 恢复按钮状态
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;

            // 显示压缩结果信息
            const sizeMB = (compressedBlob.size / (1024 * 1024)).toFixed(2);
            console.log(`压缩完成，最终大小: ${sizeMB}MB`);
            showMessage(`图片已下载，大小: ${sizeMB}MB`, 'success');
        });
    }
});