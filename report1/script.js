import { setupThaiDatePicker, formatBuddhistDate, setDefaultThaiDate } from '../component/datepicker.js';

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

    getCorsProxyUrl(url) {
        return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
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

        this.hideError();
        document.getElementById('results-container').classList.remove('show');
        document.getElementById('loading').classList.add('show');

        try {
            const data = await this.fetchMemberData(isoDate);

            this.renderTable(data);
            this.renderChart(data);

            const buddhistDate = formatBuddhistDate(this.selectedDate || new Date(isoDate));
            document.getElementById("current-date").textContent = `ข้อมูล ณ วันที่ ${buddhistDate}`;
            document.getElementById("report-title").innerHTML = `<i class="fas fa-users"></i> ${data.title}`;

            document.getElementById('loading').classList.remove('show');
            document.getElementById('results-container').classList.add('show');

        } catch (error) {
            console.error('Error:', error);
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

document.addEventListener('DOMContentLoaded', () => {
    new MemberReportSystem();
});