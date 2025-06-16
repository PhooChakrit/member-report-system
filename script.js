
class MemberReportSystem {
    constructor() {
        this.chartInstance = null;
        this.currentData = null;
        this.init();
        this.selectedDate = null;
    }

    init() {
        this.setupDatePicker();
        this.setupEventListeners();
        this.setDefaultDate();
    }

    getThaiMonth(month) {
        const thaiMonths = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        return thaiMonths[month - 1];
    }

    formatThaiDate(dateStr) {
        const [day, month, year] = dateStr.split('/');
        const thaiMonth = this.getThaiMonth(parseInt(month));
        return `${parseInt(day)} ${thaiMonth} ${year}`;
    }

    formatBuddhistDate(date) {
        const monthsThai = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
            "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const day = date.getDate();
        const month = monthsThai[date.getMonth()];
        const year = date.getFullYear() + 543;
        return `${day} ${month} ${year}`;
    }

    setDefaultDate() {
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        const buddhistFormatted = this.formatBuddhistDate(today);
        const dateInput = document.getElementById('report-date');
        dateInput.value = buddhistFormatted;
        dateInput.dataset.isoDate = today.toISOString().split('T')[0];
        this.selectedDate = today;

        document.getElementById("current-date").textContent = `ข้อมูล ณ วันที่ ${buddhistFormatted}`;
    }



    setupDatePicker() {
        const overrideDisplayedDate = (instance) => {
            if (instance.selectedDates.length > 0) {
                const date = instance.selectedDates[0];
                const display = this.formatBuddhistDate(date);
                instance.input.value = display;
            }
        };

        const convertToBuddhistYear = (instance) => {
            setTimeout(() => {
                const yearElements = instance.calendarContainer.querySelectorAll(".cur-year");
                yearElements.forEach(el => {
                    const year = parseInt(el.value);
                    if (!isNaN(year)) {
                        el.value = year + 543;
                    }
                });
            }, 5);
        };

        flatpickr("#report-date", {
            locale: "th",
            dateFormat: "d M Y",
            defaultDate: "today",
            onReady: (selectedDates, dateStr, instance) => {
                convertToBuddhistYear(instance);
                overrideDisplayedDate(instance);
            },
            onMonthChange: (selectedDates, dateStr, instance) => {
                convertToBuddhistYear(instance);
            },
            onYearChange: (selectedDates, dateStr, instance) => {
                convertToBuddhistYear(instance);
            },
            onChange: (selectedDates, dateStr, instance) => {
                convertToBuddhistYear(instance);
                overrideDisplayedDate(instance);

                this.selectedDate = selectedDates[0];
                this.selectedDate.setHours(12, 0, 0, 0);

                document.getElementById("report-date").dataset.isoDate = this.selectedDate.toISOString().split('T')[0];
            }


        });
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
            const proxyUrl = this.getCorsProxyUrl(
                `https://learningportal.ocsc.go.th/learningspaceapi/reports/1?lastdate=${isoDate}`
            );

            const response = await axios.get(proxyUrl);

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
            console.log('Fetched data:', data);


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


            const buddhistDate = this.formatBuddhistDate(this.selectedDate || new Date(isoDate));
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

        data.categories.forEach((category, index) => {
            const count = data.counts[index] || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(2) : '0.00';

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
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#f5576c',
            '#4facfe'
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

    updateCurrentDate(buddhistDate) {
        const thaiDate = this.formatThaiDate(buddhistDate);
        document.getElementById('current-date').textContent = `ข้อมูล ณ วันที่ ${thaiDate}`;
    }

    exportToExcel() {
        if (!this.currentData) return;

        const excelData = [
            ['ประเภทสมาชิก', 'จำนวน (คน)', 'เปอร์เซ็นต์ (%)']
        ];

        const total = this.currentData.total;

        this.currentData.categories.forEach((category, index) => {
            const count = this.currentData.counts[index] || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(2) : '0.00';

            excelData.push([
                category || 'ไม่มีชื่อประเภท',
                count,
                percentage + '%'
            ]);
        });

        excelData.push([
            'รวมทั้งหมด',
            total,
            '100.00%'
        ]);

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