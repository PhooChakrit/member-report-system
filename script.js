export function setupThaiDatePicker(selector, onChangeCallback, defaultDate = "today") {
    const monthsThai = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];

    const formatBuddhistDate = (date) => {
        const day = date.getDate();
        const month = monthsThai[date.getMonth()];
        const year = date.getFullYear() + 543;
        return `${day} ${month} ${year}`;
    };

    const convertToBuddhistYear = (instance) => {
        setTimeout(() => {
            const yearInputs = instance.calendarContainer.querySelectorAll(".cur-year");
            yearInputs.forEach(el => {
                let year = parseInt(el.value || el.textContent);
                if (!isNaN(year) && year < 2500) {
                    const buddhistYear = year + 543;
                    if (el.tagName === "INPUT") {
                        el.value = buddhistYear;
                    } else {
                        el.textContent = buddhistYear;
                    }
                }
            });
        }, 5);
    };

    const overrideDisplayedDate = (instance) => {
        if (instance.selectedDates.length > 0) {
            const date = instance.selectedDates[0];
            instance.input.value = formatBuddhistDate(date);
        }
    };

    return flatpickr(selector, {
        locale: "th",
        dateFormat: "d M Y",
        defaultDate: defaultDate,
        onReady: (selectedDates, dateStr, instance) => {
            convertToBuddhistYear(instance);
            overrideDisplayedDate(instance);
            if (selectedDates.length > 0) {
                const date = selectedDates[0];
                instance.input.dataset.isoDate = date.toISOString().split('T')[0];
            }
        },
        onOpen: (selectedDates, dateStr, instance) => {
            convertToBuddhistYear(instance);
        },
        onMonthChange: (selectedDates, dateStr, instance) => {
            convertToBuddhistYear(instance);
        },
        onYearChange: (selectedDates, dateStr, instance) => {
            convertToBuddhistYear(instance);
        },
        onChange: (selectedDates, dateStr, instance) => {
            if (selectedDates.length === 0) return;
            const selectedDate = selectedDates[0];
            selectedDate.setHours(12, 0, 0, 0);
            instance.input.dataset.isoDate = selectedDate.toISOString().split('T')[0];
            instance.input.value = formatBuddhistDate(selectedDate);
            convertToBuddhistYear(instance);
            if (onChangeCallback) {
                onChangeCallback(selectedDate);
            }
        },
        onClose: (selectedDates, dateStr, instance) => {
            overrideDisplayedDate(instance);
        }
    });
}

export function formatBuddhistDate(date) {
    const monthsThai = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const day = date.getDate();
    const month = monthsThai[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

export function setDefaultThaiDate(selector) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const input = document.querySelector(selector);
    if (input) {
        input.value = formatBuddhistDate(today);
        input.dataset.isoDate = today.toISOString().split('T')[0];
    }
    return today;
}


// คลาส MemberReportSystem สำหรับ report1.html
class MemberReportSystem {
    constructor() {
        this.chartInstance = null;
        this.currentData = null;
        this.selectedDate = null;
        this.init();
    }

    init() {
        setupThaiDatePicker('#report-date', (selectedDate) => {
            this.selectedDate = selectedDate;
            const buddhistDateStr = formatBuddhistDate(selectedDate);
            document.getElementById("current-date").textContent = `ข้อมูล ณ วันที่ ${buddhistDateStr}`;
        });

        this.selectedDate = setDefaultThaiDate('#report-date');
        document.getElementById("current-date").textContent =
            `ข้อมูล ณ วันที่ ${formatBuddhistDate(this.selectedDate)}`;

        this.setupEventListeners();
        this.generateReport();
    }

    setupEventListeners() {
        document.getElementById('submit-btn').addEventListener('click', () => {
            this.generateReport();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportToExcel();
        });
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div class="toast-content">${message}</div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    }

    showError(message, details = '') {
        const errorMessage = document.getElementById('error-message');
        document.getElementById('error-content').textContent = message;
        document.getElementById('error-details').textContent = details;
        errorMessage.classList.add('show');
    }

    hideError() {
        document.getElementById('error-message').classList.remove('show');
    }

    async fetchMemberData(isoDate) {
        try {
            const apiUrl = `https://learningportal.ocsc.go.th/learningspaceapi/reports/1?lastdate=${isoDate}`;
            const response = await axios.get(apiUrl);

            if (response.status === 404) {
                throw new Error('404 Not Found - ไม่พบข้อมูล');
            } else if (response.status === 500) {
                throw new Error('500 Internal Server Error - ข้อผิดพลาดเซิร์ฟเวอร์');
            } else if (response.status === 408) {
                throw new Error('408 Request Timeout - การร้องขอหมดเวลา');
            } else if (response.status !== 200) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            const data = response.data;
            if (!data || !Array.isArray(data.x) || !Array.isArray(data.y)) {
                throw new Error('รูปแบบข้อมูลจาก API ไม่ถูกต้อง');
            }

            return {
                title: data.title,
                categories: data.x,
                counts: data.y
            };

        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    async generateReport() {
        const dateInput = document.getElementById('report-date');
        const isoDate = this.selectedDate
            ? this.selectedDate.toISOString().split('T')[0]
            : dateInput.dataset.isoDate;

        if (!isoDate) {
            this.showToast('กรุณาเลือกวันที่');
            return;
        }

        // ซ่อนผลลัพธ์เก่าและแสดง loading
        this.hideError();
        document.getElementById('results-container').classList.remove('show');
        document.getElementById('loading').classList.add('show');

        // ล้างตารางและกราฟเก่า
        document.getElementById('table-body').innerHTML = '';
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        // แสดงสถานะ loading ในตาราง
        const loadingRow = document.createElement('tr');
        loadingRow.innerHTML = `
        <td colspan="3" style="text-align: center; color: #667eea;">
            <div class="loading-spinner-small"></div>
            กำลังโหลดข้อมูล...
        </td>
    `;
        document.getElementById('table-body').appendChild(loadingRow);

        try {
            const data = await this.fetchMemberData(isoDate);

            // ล้างสถานะ loading
            document.getElementById('table-body').innerHTML = '';

            this.renderTable(data);
            this.renderChart(data);

            const buddhistDate = formatBuddhistDate(this.selectedDate || new Date(isoDate));
            document.getElementById("current-date").textContent = `ข้อมูล ณ วันที่ ${buddhistDate}`;
            document.getElementById("report-title").innerHTML = `<i class="fas fa-users"></i> ${data.title}`;

            document.getElementById('loading').classList.remove('show');
            document.getElementById('results-container').classList.add('show');

        } catch (error) {
            console.error('Error:', error);
            // ล้างสถานะ loading เมื่อเกิดข้อผิดพลาด
            document.getElementById('table-body').innerHTML = '';

            this.showToast(`เกิดข้อผิดพลาด: ${error.message}`);

            let errorDetails = '';
            if (error.message.includes('500')) {
                errorDetails = 'เซิร์ฟเวอร์ประสบปัญหาภายใน กรุณาลองใหม่ในภายหลัง';
            } else if (error.message.includes('408')) {
                errorDetails = 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่หรือตรวจสอบเครือข่ายของคุณ';
            } else {
                errorDetails = 'ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบวันที่หรือลองใหม่ภายหลัง';
            }

            this.showError(`เกิดข้อผิดพลาด: ${error.message}`, errorDetails);
            document.getElementById('loading').classList.remove('show');
        }
    }

    renderTable(data) {
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '';

        if (!data || !data.counts || !data.categories ||
            !Array.isArray(data.counts) || !Array.isArray(data.categories)) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="3" style="text-align: center; color: #ef4444;">ไม่มีข้อมูลหรือข้อมูลไม่ถูกต้อง</td>`;
            tableBody.appendChild(row);
            return;
        }

        const total = data.counts.reduce((sum, count) => sum + count, 0);

        const rawPercentages = data.counts.map(c => (total > 0 ? (c / total) * 100 : 0));
        const roundedPercentages = rawPercentages.map(p => Math.round(p * 100) / 100);
        let percentageSum = roundedPercentages.reduce((a, b) => a + b, 0);

        let adjustment = Math.round((100 - percentageSum) * 100) / 100;
        roundedPercentages[roundedPercentages.length - 1] += adjustment;

        data.categories.forEach((category, index) => {
            const count = data.counts[index] || 0;
            const percentage = roundedPercentages[index].toFixed(2);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category || 'ไม่มีชื่อประเภท'}</td>
                <td>${count.toLocaleString()}</td>
                <td>${percentage}%</td>
            `;
            tableBody.appendChild(row);
        });

        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.style.backgroundColor = '#f7fafc';
        totalRow.innerHTML = `
            <td>รวมทั้งหมด</td>
            <td>${total.toLocaleString()}</td>
            <td>100.00%</td>
        `;
        tableBody.appendChild(totalRow);

        this.currentData = {
            ...data,
            total: total
        };
    }

    renderChart(data) {
        const ctx = document.getElementById('members-chart').getContext('2d');

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        if (!data || !data.counts || !data.categories ||
            !Array.isArray(data.counts) || !Array.isArray(data.categories)) {
            return;
        }

        const colors = [
            '#003f5c',
            '#58508d',
            '#bc5090',
            '#ff6361',
            '#ffa600',
        ];

        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.categories,
                datasets: [{
                    data: data.counts,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(2);
                                return `${context.label}: ${context.raw.toLocaleString()} คน (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    exportToExcel() {
        if (!this.currentData) return;

        const excelData = [
            ['ประเภทสมาชิก', 'จำนวน (คน)', 'เปอร์เซ็นต์ (%)']
        ];

        const total = this.currentData.total;
        const buddhistDateStr = formatBuddhistDate(this.selectedDate || new Date());
        const rawPercentages = this.currentData.counts.map(c => (total > 0 ? (c / total) * 100 : 0));
        const roundedPercentages = rawPercentages.map(p => Math.round(p * 100) / 100);
        let percentageSum = roundedPercentages.reduce((a, b) => a + b, 0);
        let adjustment = Math.round((100 - percentageSum) * 100) / 100;
        roundedPercentages[roundedPercentages.length - 1] += adjustment;

        this.currentData.categories.forEach((category, index) => {
            const count = this.currentData.counts[index] || 0;
            const percentage = roundedPercentages[index].toFixed(2);

            excelData.push([
                category || 'ไม่มีชื่อประเภท',
                count,
                percentage + '%'
            ]);
        });

        excelData.push([
            'รวมทั้งหมด',
            total,
            '100.00%',
        ]);
        excelData.push([]);
        excelData.push([`ข้อมูล ณ วันที่ ${buddhistDateStr}`]);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "รายงานสมาชิก");

        const dateInput = document.getElementById('report-date');
        const christianDate = dateInput.dataset.isoDate.replace(/-/g, '');
        XLSX.writeFile(wb, `member_report_${christianDate}.xlsx`);
    }
}

// คลาส CourseReportSystem สำหรับ report2.html และ report3.html
class CourseReportSystem {
    constructor(type = 2) {
        this.chartInstance = null;
        this.currentData = null;
        this.startDate = null;
        this.endDate = null;
        this.colorPalette = this.generateColorPalette(100);
        this.type = type; // 2 = หลักสูตร, 3 = รายวิชา
        this.init();
    }

    init() {
        setupThaiDatePicker('#start-date', (startDate) => {
            this.startDate = startDate;
            const buddhistDateStr = formatBuddhistDate(startDate);
            document.getElementById("start-date").textContent = `ข้อมูล ณ วันที่ ${buddhistDateStr}`;
        });

        this.startDate = setDefaultThaiDate('#start-date');
        document.getElementById("start-date").textContent =
            `ข้อมูล ณ วันที่ ${formatBuddhistDate(this.startDate)}`;

        setupThaiDatePicker('#end-date', (endDate) => {
            this.endDate = endDate;
            const buddhistDateStr = formatBuddhistDate(endDate);
            document.getElementById("end-date").textContent = `ข้อมูล ณ วันที่ ${buddhistDateStr}`;
        });

        this.endDate = setDefaultThaiDate('#end-date');
        document.getElementById("end-date").textContent =
            `ข้อมูล ณ วันที่ ${formatBuddhistDate(this.endDate)}`;
        this.updateDateDisplay();
        this.setupEventListeners();
        this.generateReport();
    }

    updateDateDisplay() {
        if (this.startDate && this.endDate) {
            const startStr = formatBuddhistDate(this.startDate);
            const endStr = formatBuddhistDate(this.endDate);
            document.getElementById("current-date-range").textContent =
                `ข้อมูลระหว่างวันที่ ${startStr} ถึง ${endStr}`;
        }
    }

    formatChristianDate(date) {
        return date.toISOString().split('T')[0];
    }

    setupEventListeners() {
        document.getElementById('submit-btn').addEventListener('click', () => {
            this.generateReport();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportToExcel();
        });
    }

    async fetchCourseData(startDate, endDate) {
        try {
            const apiUrl = `https://learningportal.ocsc.go.th/learningspaceapi/reports/${this.type}?startDate=${this.formatChristianDate(startDate)}&endDate=${this.formatChristianDate(endDate)}`;
            const response = await axios.get(apiUrl);
            console.log(`Fetching data from: ${apiUrl}`);

            if (response.status !== 200) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            const data = response.data;
            if (!data || !Array.isArray(data.x) || !Array.isArray(data.y1) || !Array.isArray(data.y2)) {
                throw new Error('รูปแบบข้อมูลจาก API ไม่ถูกต้อง');
            }

            return {
                title: data.title || (this.type === 2 ? 'รายงานจำนวนผู้เรียนในแต่ละหลักสูตร' : 'รายงานจำนวนผู้เรียนในแต่ละรายวิชา'),
                categories: data.x,
                activeLearners: data.y1,
                completedLearners: data.y2
            };

        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    async generateReport() {
        if (!this.startDate || !this.endDate) {
            this.showToast('กรุณาเลือกทั้งวันที่เริ่มต้นและสิ้นสุด');
            return;
        }

        if (this.startDate > this.endDate) {
            this.showToast('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
            return;
        }

        // ซ่อนผลลัพธ์เก่าและแสดง loading
        this.hideError();
        document.getElementById('results-container').classList.remove('show');
        document.getElementById('loading').classList.add('show');

        // ล้างตารางและกราฟเก่า
        document.getElementById('table-body').innerHTML = '';
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        // แสดงสถานะ loading ในตาราง
        const loadingRow = document.createElement('tr');
        loadingRow.innerHTML = `
        <td colspan="4" style="text-align: center; color: #667eea;">
            <div class="loading-spinner-small"></div>
            กำลังโหลดข้อมูล...
        </td>
    `;
        document.getElementById('table-body').appendChild(loadingRow);

        try {
            const data = await this.fetchCourseData(this.startDate, this.endDate);

            // ล้างสถานะ loading
            document.getElementById('table-body').innerHTML = '';

            this.currentData = data;
            this.renderTable(data);
            this.renderChart(data);

            const startStr = formatBuddhistDate(this.startDate);
            const endStr = formatBuddhistDate(this.endDate);
            document.getElementById("current-date-range").textContent =
                `ข้อมูลระหว่างวันที่ ${startStr} ถึง ${endStr}`;
            document.getElementById("report-title").innerHTML =
                `<i class="fas fa-users"></i> ${data.title}`;

            document.getElementById('loading').classList.remove('show');
            document.getElementById('results-container').classList.add('show');

        } catch (error) {
            console.error('Error:', error);
            // ล้างสถานะ loading เมื่อเกิดข้อผิดพลาด
            document.getElementById('table-body').innerHTML = '';

            this.showError(
                `เกิดข้อผิดพลาด: ${error.message}`,
                'ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบช่วงวันที่หรือลองใหม่ภายหลัง'
            );
            document.getElementById('loading').classList.remove('show');
        }
    }

    renderTable(data) {
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '';

        if (!data || !data.categories || !data.activeLearners || !data.completedLearners) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="3" style="text-align: center; color: #ef4444;">ไม่มีข้อมูลหรือข้อมูลไม่ถูกต้อง</td>`;
            tableBody.appendChild(row);
            return;
        }

        data.categories.forEach((category, index) => {
            const active = data.activeLearners[index] || 0;
            const completed = data.completedLearners[index] || 0;

            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${category || (this.type === 2 ? 'ไม่มีชื่อหลักสูตร' : 'ไม่มีชื่อรายวิชา')}</td>
            <td>${active.toLocaleString()}</td>
            <td>${completed.toLocaleString()}</td>
        `;
            tableBody.appendChild(row);
        });
    }

    generateColorPalette(count) {
        const palette = [];
        const hueStep = 360 / count;

        for (let i = 0; i < count; i++) {
            const hue = Math.floor(i * hueStep);
            const saturation = 70 + Math.floor(Math.random() * 30);
            const lightness = 50 + Math.floor(Math.random() * 20);
            palette.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }

        return palette;
    }

    // renderChart(data) {
    //     const ctx = document.getElementById('members-chart').getContext('2d');
    //     if (this.chartInstance) {
    //         this.chartInstance.destroy();
    //     }
    //     if (!data || !data.categories || !data.activeLearners || !data.completedLearners) {
    //         return;
    //     }

    //     const count = data.categories.length;

    //     const getScaleSettings = (dataCount) => {
    //         if (dataCount <= 10) {
    //             return {
    //                 maxRotation: 0,
    //                 minRotation: 0,
    //                 fontSize: 12
    //             };
    //         } else if (dataCount <= 20) {
    //             return {
    //                 maxRotation: 30,
    //                 minRotation: 30,
    //                 fontSize: 10
    //             };
    //         } else if (dataCount <= 40) {
    //             return {
    //                 maxRotation: 60,
    //                 minRotation: 60,
    //                 fontSize: 9
    //             };
    //         } else {
    //             return {
    //                 maxRotation: 80,
    //                 minRotation: 80,
    //                 fontSize: 8
    //             };
    //         }
    //     };

    //     const scaleSettings = getScaleSettings(count);

    //     const generateQualitativeColors = (numColors) => {
    //         const baseColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b',
    //             '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#e84393',
    //             '#00b894', '#00cec9', '#2d3436', '#636e72', '#74b9ff',
    //             '#0984e3', '#fdcb6e', '#e17055', '#81ecec', '#00b894',
    //             '#ff7675', '#fd79a8', '#6c5ce7', '#a29bfe', '#74b9ff',
    //             '#55a3ff', '#26de81', '#feca57', '#ff9ff3', '#54a0ff',
    //             '#5f27cd', '#00d2d3', '#ff9f43', '#ee5a24', '#0abde3',
    //             '#006ba6', '#0582ca', '#00a6fb', '#0075f2', '#144fc6',
    //             '#8e44ad', '#9b59b6', '#e74c3c', '#c0392b', '#f39c12',
    //             '#d35400', '#27ae60', '#2ecc71', '#16a085', '#1abc9c',
    //             '#34495e', '#2c3e50', '#95a5a6', '#7f8c8d', '#ecf0f1',
    //             '#bdc3c7', '#3498db', '#2980b9', '#e67e22', '#d35400',
    //             '#f1c40f', '#f39c12', '#2ecc71', '#27ae60', '#1abc9c',
    //             '#e78ac3', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
    //             '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5',
    //             '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f',
    //             '#e5c494', '#b3b3b3', '#8dd3c7', '#ffffb3', '#bebada',
    //             '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5',
    //             '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f', '#1b9e77',
    //             '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02',
    //             '#a6761d', '#666666', '#2ca02c', '#d62728', '#9467bd',
    //             '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    //         ];

    //         const colors = [];

    //         if (numColors <= baseColors.length) {
    //             return baseColors.slice(0, numColors);
    //         }

    //         for (let i = 0; i < numColors; i++) {
    //             if (i < baseColors.length) {
    //                 colors.push(baseColors[i]);
    //             } else {
    //                 const hue = (i * 137.508) % 360;
    //                 const saturation = 70 + (i % 4) * 5;
    //                 const lightness = 45 + (Math.floor(i / 4) % 4) * 8;
    //                 colors.push(`hsl(${Math.floor(hue)}, ${saturation}%, ${lightness}%)`);
    //             }
    //         }

    //         return colors;
    //     };

    //     const baseColors = generateQualitativeColors(count);

    //     const activeColors = [];
    //     const completedColors = [];

    //     for (let i = 0; i < count; i++) {
    //         const baseColor = baseColors[i];
    //         activeColors.push(baseColor);
    //         let completedColor;
    //         if (baseColor.startsWith('#')) {
    //             completedColor = this.darkenHexColor(baseColor, 0.3);
    //         } else {
    //             completedColor = this.adjustHSLLightness(baseColor, -25);
    //         }
    //         completedColors.push(completedColor);
    //     }

    //     this.chartInstance = new Chart(ctx, {
    //         type: 'bar',
    //         data: {
    //             labels: data.categories,
    //             datasets: [
    //                 {
    //                     label: 'กำลังเรียน',
    //                     data: data.activeLearners,
    //                     backgroundColor: activeColors,
    //                     borderColor: activeColors,
    //                     borderWidth: 1
    //                 },
    //                 {
    //                     label: 'เรียนจบ',
    //                     data: data.completedLearners,
    //                     backgroundColor: completedColors,
    //                     borderColor: completedColors,
    //                     borderWidth: 1
    //                 }
    //             ]
    //         },
    //         options: {
    //             plugins: {
    //                 legend: {
    //                     display: false
    //                 },
    //                 tooltip: {
    //                     callbacks: {
    //                         label: function (context) {
    //                             return `${context.dataset.label}: ${context.raw.toLocaleString()} คน`;
    //                         }
    //                     }
    //                 }
    //             },
    //             responsive: true,
    //             maintainAspectRatio: false,
    //             scales: {
    //                 x: {
    //                     stacked: false,
    //                     ticks: {
    //                         maxRotation: scaleSettings.maxRotation,
    //                         minRotation: scaleSettings.minRotation,
    //                         font: {
    //                             size: scaleSettings.fontSize
    //                         }
    //                     }
    //                 },
    //                 y: { beginAtZero: true }
    //             }
    //         }
    //     });
    // }
    renderChart(data) {
    const ctx = document.getElementById('members-chart').getContext('2d');
    if (this.chartInstance) {
        this.chartInstance.destroy();
    }
    if (!data || !data.categories || !data.activeLearners || !data.completedLearners) {
        return;
    }

    const count = data.categories.length;

    const getScaleSettings = (dataCount) => {
        if (dataCount <= 10) {
            return {
                maxRotation: 0,
                minRotation: 0,
                fontSize: 12
            };
        } else if (dataCount <= 20) {
            return {
                maxRotation: 30,
                minRotation: 30,
                fontSize: 10
            };
        } else if (dataCount <= 40) {
            return {
                maxRotation: 60,
                minRotation: 60,
                fontSize: 9
            };
        } else {
            return {
                maxRotation: 80,
                minRotation: 80,
                fontSize: 8
            };
        }
    };

    const scaleSettings = getScaleSettings(count);

    // Define our two contrasting colors
    const activeColor = '#FF7F50';  // Coral (orange shade)
    const completedColor = '#4682B4'; // Steel Blue

    this.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.categories,
            datasets: [
                {
                    label: 'ผู้ลงทะเบียน (คน)',
                    data: data.activeLearners,
                    backgroundColor: activeColor,
                    borderColor: activeColor,
                    borderWidth: 1
                },
                {
                    label: 'ผู้เรียนจบ (คน)',
                    data: data.completedLearners,
                    backgroundColor: completedColor,
                    borderColor: completedColor,
                    borderWidth: 1
                }
            ]
        },
        options: {
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false,
                    ticks: {
                        maxRotation: scaleSettings.maxRotation,
                        minRotation: scaleSettings.minRotation,
                        font: {
                            size: scaleSettings.fontSize
                        }
                    }
                },
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'จำนวน (คน)'
                    }
                }
            }
        }
    });
}

    darkenHexColor(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        const newR = Math.floor(r * (1 - factor));
        const newG = Math.floor(g * (1 - factor));
        const newB = Math.floor(b * (1 - factor));

        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    adjustHSLLightness(hslColor, adjustment) {
        const hslMatch = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (!hslMatch) return hslColor;

        const hue = parseInt(hslMatch[1]);
        const saturation = parseInt(hslMatch[2]);
        const lightness = Math.max(15, Math.min(85, parseInt(hslMatch[3]) + adjustment));

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    exportToExcel() {
        if (!this.currentData || !this.startDate || !this.endDate) return;

        const excelData = [
            [this.type === 2 ? 'หลักสูตร' : 'รายวิชา', 'ผู้ลงทะเบียน (คน)', 'ผู้เรียนจบ (คน)']
        ];

        const startStr = formatBuddhistDate(this.startDate);
        const endStr = formatBuddhistDate(this.endDate);

        this.currentData.categories.forEach((category, index) => {
            const active = this.currentData.activeLearners[index] || 0;
            const completed = this.currentData.completedLearners[index] || 0;

            excelData.push([
                category || (this.type === 2 ? 'ไม่มีชื่อหลักสูตร' : 'ไม่มีชื่อรายวิชา'),
                active,
                completed,
                // total
            ]);
        });


        excelData.push([], [`ข้อมูลระหว่างวันที่ ${startStr} ถึง ${endStr}`]);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, this.type === 2 ? "รายงานหลักสูตร" : "รายงานรายวิชา");

        const startDateStr = this.startDate.toISOString().split('T')[0].replace(/-/g, '');
        const endDateStr = this.endDate.toISOString().split('T')[0].replace(/-/g, '');
        XLSX.writeFile(wb, `${this.type === 2 ? 'course' : 'subject'}_report_${startDateStr}_${endDateStr}.xlsx`);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div class="toast-content">${message}</div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    }

    showError(message, details = '') {
        const errorMessage = document.getElementById('error-message');
        document.getElementById('error-content').textContent = message;
        document.getElementById('error-details').textContent = details;
        errorMessage.classList.add('show');
    }

    hideError() {
        document.getElementById('error-message').classList.remove('show');
    }
}

// ตรวจสอบหน้าและเรียกคลาสที่เหมาะสม
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('report1.html')) {
        new MemberReportSystem();
    } else if (path.includes('report2.html')) {
        new CourseReportSystem(2); // หลักสูตร
    } else if (path.includes('report3.html')) {
        new CourseReportSystem(3); // รายวิชา
    }
});
