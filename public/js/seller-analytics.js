
import { auth, database } from './firebase-config-analytics.js';


let currentSellerId = null;
let dateRange = {
    start: new Date(new Date().setDate(new Date().getDate() - 30)), 
    end: new Date()
};

function showSpinner() {
    document.getElementById('spinner').style.display = 'flex';
}

function hideSpinner() {
    document.getElementById('spinner').style.display = 'none';
}

async function checkAuth() {
    return new Promise((resolve, reject) => {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                resolve(user);
            } else {
                window.location.href = 'seller-login.html';
                reject('No user logged in');
            }
        });
    });
}

async function initializeAnalytics() {
    try {
        showSpinner();
        await checkAuth();
        await loadSellerProfile();
        await loadAnalytics();
        initializeDateRangePicker();
        hideSpinner();
    } catch (error) {
        console.error('Error initializing analytics:', error);
        hideSpinner();
    }
}

async function loadSellerProfile() {
    try {
        showSpinner();
        const user = auth.currentUser;
        if (!user) return;

        currentSellerId = user.uid;
        const sellerRef = database.ref(`sellers/${currentSellerId}`);
        const snapshot = await sellerRef.get();
        
        if (snapshot.exists()) {
            const sellerData = snapshot.val();
            updateSellerInfo(sellerData);
        }
    } catch (error) {
        console.error('Error loading seller profile:', error);
    } finally {
        hideSpinner();
    }
}

function updateSellerInfo(sellerData) {
    document.getElementById('sellerName').textContent = sellerData.name;
    document.getElementById('sellerAddress').textContent = sellerData.address;
    document.getElementById('sellerPhone').textContent = sellerData.phone;
    document.getElementById('sellerRating').textContent = sellerData.rating.toFixed(1);
    document.getElementById('sellerTotalOrders').textContent = sellerData.totalOrders;
    document.getElementById('sellerTotalRevenue').textContent = `₹${sellerData.totalRevenue}`;
}

async function loadAnalytics() {
    try {
        showSpinner();
        const ordersRef = database.ref('orders');
        const snapshot = await ordersRef.get();
        
        if (snapshot.exists()) {
            const orders = Object.values(snapshot.val())
                .filter(order => order.sellerId === currentSellerId);
            
            updateAnalytics(orders);
            generateReports(orders);
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    } finally {
        hideSpinner();
    }
}
function updateAnalytics(orders) {
   
    const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });


    const metrics = calculateMetrics(filteredOrders);
    
    updateMetricsUI(metrics);
    
  
    generateCharts(filteredOrders, metrics);
}


function calculateMetrics(orders) {
    const metrics = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
        averageOrderValue: 0,
        completionRate: 0,
        popularItems: {},
        paymentMethods: {},
        orderStatus: {},
        dailyRevenue: {},
        hourlyDistribution: {}
    };


    metrics.averageOrderValue = metrics.totalRevenue / metrics.totalOrders;

    const completedOrders = orders.filter(order => order.status === 'completed').length;
    metrics.completionRate = (completedOrders / metrics.totalOrders) * 100;

    orders.forEach(order => {
        order.items.forEach(item => {
            metrics.popularItems[item.name] = (metrics.popularItems[item.name] || 0) + item.quantity;
        });

        metrics.paymentMethods[order.paymentMethod] = (metrics.paymentMethods[order.paymentMethod] || 0) + 1;

        metrics.orderStatus[order.status] = (metrics.orderStatus[order.status] || 0) + 1;

        const date = new Date(order.createdAt).toLocaleDateString();
        metrics.dailyRevenue[date] = (metrics.dailyRevenue[date] || 0) + order.total;

        const hour = new Date(order.createdAt).getHours();
        metrics.hourlyDistribution[hour] = (metrics.hourlyDistribution[hour] || 0) + 1;
    });

    return metrics;
}

function updateMetricsUI(metrics) {
    document.getElementById('totalOrders').textContent = metrics.totalOrders;
    document.getElementById('totalRevenue').textContent = `₹${metrics.totalRevenue.toFixed(2)}`;
    document.getElementById('averageOrderValue').textContent = `₹${metrics.averageOrderValue.toFixed(2)}`;
    document.getElementById('completionRate').textContent = `${metrics.completionRate.toFixed(1)}%`;
}

function generateCharts(orders, metrics) {

    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: Object.keys(metrics.dailyRevenue),
            datasets: [{
                label: 'Daily Revenue',
                data: Object.values(metrics.dailyRevenue),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const statusCtx = document.getElementById('statusChart').getContext('2d');
    new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(metrics.orderStatus),
            datasets: [{
                data: Object.values(metrics.orderStatus),
                backgroundColor: [
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 205, 86)',
                    'rgb(75, 192, 192)'
                ]
            }]
        }
    });

    const itemsCtx = document.getElementById('itemsChart').getContext('2d');
    new Chart(itemsCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(metrics.popularItems),
            datasets: [{
                label: 'Items Sold',
                data: Object.values(metrics.popularItems),
                backgroundColor: 'rgb(75, 192, 192)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function generateReports(orders) {
    const reportContainer = document.getElementById('reportContainer');
    reportContainer.innerHTML = '';

    
    const salesReport = generateSalesReport(orders);
    reportContainer.appendChild(salesReport);


    const inventoryReport = generateInventoryReport(orders);
    reportContainer.appendChild(inventoryReport);

  
    const customerReport = generateCustomerReport(orders);
    reportContainer.appendChild(customerReport);
}


function generateSalesReport(orders) {
    const report = document.createElement('div');
    report.className = 'report-section';
    report.innerHTML = `
        <h3>Sales Report</h3>
        <table class="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Average Order Value</th>
                </tr>
            </thead>
            <tbody>
                ${generateSalesReportRows(orders)}
            </tbody>
        </table>
    `;
    return report;
}


function generateInventoryReport(orders) {
    const report = document.createElement('div');
    report.className = 'report-section';
    report.innerHTML = `
        <h3>Inventory Report</h3>
        <table class="table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Quantity Sold</th>
                    <th>Revenue</th>
                </tr>
            </thead>
            <tbody>
                ${generateInventoryReportRows(orders)}
            </tbody>
        </table>
    `;
    return report;
}


function generateCustomerReport(orders) {
    const report = document.createElement('div');
    report.className = 'report-section';
    report.innerHTML = `
        <h3>Customer Report</h3>
        <table class="table">
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Last Order</th>
                </tr>
            </thead>
            <tbody>
                ${generateCustomerReportRows(orders)}
            </tbody>
        </table>
    `;
    return report;
}


function initializeDateRangePicker() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    startDate.value = dateRange.start.toISOString().split('T')[0];
    endDate.value = dateRange.end.toISOString().split('T')[0];

    startDate.addEventListener('change', updateDateRange);
    endDate.addEventListener('change', updateDateRange);
}

async function updateDateRange() {
    try {
        showSpinner();
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');

        dateRange.start = new Date(startDate.value);
        dateRange.end = new Date(endDate.value);

        await loadAnalytics();
    } catch (error) {
        console.error('Error updating date range:', error);
    } finally {
        hideSpinner();
    }
}

async function exportReports() {
    try {
        showSpinner();
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Seller Analytics Report', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Seller Name: ${document.getElementById('sellerName').textContent}`, 20, 40);
        doc.text(`Address: ${document.getElementById('sellerAddress').textContent}`, 20, 50);
        doc.text(`Phone: ${document.getElementById('sellerPhone').textContent}`, 20, 60);
        
        doc.setFontSize(14);
        doc.text('Performance Metrics', 20, 80);
        doc.setFontSize(12);
        doc.text(`Rating: ${document.getElementById('sellerRating').textContent}`, 20, 90);
        doc.text(`Total Orders: ${document.getElementById('sellerTotalOrders').textContent}`, 20, 100);
        doc.text(`Total Revenue: ${document.getElementById('sellerTotalRevenue').textContent}`, 20, 110);
        
        doc.text(`Report Period: ${document.getElementById('startDate').value} to ${document.getElementById('endDate').value}`, 20, 120);
        
        doc.setFontSize(14);
        doc.text('Key Metrics', 20, 140);
        doc.setFontSize(12);
        doc.text(`Total Orders: ${document.getElementById('totalOrders').textContent}`, 20, 150);
        doc.text(`Total Revenue: ${document.getElementById('totalRevenue').textContent}`, 20, 160);
        doc.text(`Average Order Value: ${document.getElementById('averageOrderValue').textContent}`, 20, 170);
        doc.text(`Completion Rate: ${document.getElementById('completionRate').textContent}`, 20, 180);
        
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Sales Report', 20, 20);
        
        const salesTable = document.querySelector('#reportContainer .report-section:nth-child(1) table');
        if (salesTable) {
            const salesData = Array.from(salesTable.querySelectorAll('tbody tr')).map(row => 
                Array.from(row.cells).map(cell => cell.textContent)
            );
            
            doc.autoTable({
                head: [['Date', 'Orders', 'Revenue', 'Average Order Value']],
                body: salesData,
                startY: 30,
                theme: 'grid'
            });
        }
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Inventory Report', 20, 20);
        
        const inventoryTable = document.querySelector('#reportContainer .report-section:nth-child(2) table');
        if (inventoryTable) {
            const inventoryData = Array.from(inventoryTable.querySelectorAll('tbody tr')).map(row => 
                Array.from(row.cells).map(cell => cell.textContent)
            );
            
            doc.autoTable({
                head: [['Item', 'Quantity Sold', 'Revenue']],
                body: inventoryData,
                startY: 30,
                theme: 'grid'
            });
        }
        
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Customer Report', 20, 20);
        
        const customerTable = document.querySelector('#reportContainer .report-section:nth-child(3) table');
        if (customerTable) {
            const customerData = Array.from(customerTable.querySelectorAll('tbody tr')).map(row => 
                Array.from(row.cells).map(cell => cell.textContent)
            );
            
            doc.autoTable({
                head: [['Customer', 'Orders', 'Total Spent', 'Last Order']],
                body: customerData,
                startY: 30,
                theme: 'grid'
            });
        }
        
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Analytics Charts', 20, 20);
        
        const charts = ['revenueChart', 'statusChart', 'itemsChart'];
        let yPosition = 40;
        
        for (const chartId of charts) {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 20, yPosition, 170, 100);
                yPosition += 120;
            }
        }
        const fileName = `seller-report-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        hideSpinner();
    } catch (error) {
        console.error('Error generating PDF report:', error);
        alert('Error generating report. Please try again.');
        hideSpinner();
    }
}
window.exportReports = exportReports;

function generateSalesReportRows(orders) {
    const dailyStats = {};
    
    orders.forEach(order => {
        const date = new Date(order.createdAt).toLocaleDateString();
        if (!dailyStats[date]) {
            dailyStats[date] = {
                orders: 0,
                revenue: 0
            };
        }
        dailyStats[date].orders++;
        dailyStats[date].revenue += order.total;
    });

    return Object.entries(dailyStats)
        .map(([date, stats]) => `
            <tr>
                <td>${date}</td>
                <td>${stats.orders}</td>
                <td>₹${stats.revenue.toFixed(2)}</td>
                <td>₹${(stats.revenue / stats.orders).toFixed(2)}</td>
            </tr>
        `)
        .join('');
}

function generateInventoryReportRows(orders) {
    const itemStats = {};
    
    orders.forEach(order => {
        order.items.forEach(item => {
            if (!itemStats[item.name]) {
                itemStats[item.name] = {
                    quantity: 0,
                    revenue: 0
                };
            }
            itemStats[item.name].quantity += item.quantity;
            itemStats[item.name].revenue += item.price * item.quantity;
        });
    });

    return Object.entries(itemStats)
        .map(([name, stats]) => `
            <tr>
                <td>${name}</td>
                <td>${stats.quantity}</td>
                <td>₹${stats.revenue.toFixed(2)}</td>
            </tr>
        `)
        .join('');
}
function generateCustomerReportRows(orders) {
    const customerStats = {};
    
    orders.forEach(order => {
        if (!customerStats[order.customerId]) {
            customerStats[order.customerId] = {
                name: order.customerName || 'Unknown',
                orders: 0,
                totalSpent: 0,
                lastOrder: new Date(order.createdAt)
            };
        }
        customerStats[order.customerId].orders++;
        customerStats[order.customerId].totalSpent += order.total;
        const orderDate = new Date(order.createdAt);
        if (orderDate > customerStats[order.customerId].lastOrder) {
            customerStats[order.customerId].lastOrder = orderDate;
        }
    });

 
    return Object.entries(customerStats)
        .map(([id, stats]) => `
            <tr>
                <td>${stats.name}</td>
                <td>${stats.orders}</td>
                <td>₹${stats.totalSpent.toFixed(2)}</td>
                <td>${stats.lastOrder.toLocaleDateString()}</td>
            </tr>
        `)
        .join('');
}

document.addEventListener('DOMContentLoaded', initializeAnalytics); 