// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRqEx8sXxnnoJzfL946DgHmHAlNiai504",
  authDomain: "constructionpaymenttrack-2bd0f.firebaseapp.com",
  projectId: "constructionpaymenttrack-2bd0f",
  storageBucket: "constructionpaymenttrack-2bd0f.firebasestorage.app",
  messagingSenderId: "962451990647",
  appId: "1:962451990647:web:e8c666cff6efb338fe7e72",
  measurementId: "G-QMHV4F860S"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Firestore settings with offline persistence
db.settings({ 
  experimentalForceLongPolling: true,
  merge: true
});

// Enable offline persistence
firebase.firestore().enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser does not support all features required for persistence");
    }
  });

// App state
let currentProject = null;
let currentPayments = [];
let currentSale = null;
let charts = {}; // Object to store all chart instances
let editingPaymentId = null;
let editingProjectId = null;
let paymentsDataTable = null;

// Initialize app with background styling
document.addEventListener('DOMContentLoaded', function() {
    // Apply background style
    document.body.style.backgroundImage = "url('https://images.unsplash.com/photo-1605106702734-205df224ecce?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundPosition = "center";
    document.body.style.opacity = "0.8";
    
    // Initialize empty DataTable structure
    initializeDataTable();
    
    loadProjects();
    document.getElementById('paymentDate').valueAsDate = new Date();
    document.getElementById('saleDate').valueAsDate = new Date();
});
function initializeDataTable() {
    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#paymentsTable')) {
        paymentsDataTable.destroy();
        $('#paymentsTable').empty();
    }
    
    // Create table structure if it doesn't exist
    if ($('#paymentsTable').length === 0) {
        const paymentsTab = document.getElementById('paymentsTab');
        const tableHTML = `
            <table id="paymentsTable" class="display" style="width:100%">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Paid By</th>
                        <th>Paid To</th>
                        <th>Amount</th>
                        <th>Quantity</th>
                        <th>Payment For</th>
                        <th>Type</th>
                        <th>Comments</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `;
        paymentsTab.insertAdjacentHTML('beforeend', tableHTML);
    }
    
    // Initialize DataTable with empty data
    paymentsDataTable = $('#paymentsTable').DataTable({
        responsive: true,
        pageLength: 10,
        order: [[0, 'desc']],
        initComplete: function() {
            // Initialize filters after table is created
            initTableFilters();
        }
    });
}

function initTableFilters() {
    const paidByFilter = $('#paidByFilter');
    paidByFilter.empty().append('<option value="">All</option>');
    
    if (currentProject?.partners) {
        currentProject.partners.forEach(partner => {
            paidByFilter.append(`<option value="${partner}">${partner}</option>`);
        });
    }
    
    paidByFilter.off('change').on('change', function() {
        paymentsDataTable.column(1).search(this.value).draw();
    });
    
    $('#dateFilter').off('change').on('change', function() {
        paymentsDataTable.column(0).search(this.value).draw();
    });
}
function initializePaymentsTable() {
    if ($.fn.DataTable.isDataTable('#paymentsTable')) {
        $('#paymentsTable').DataTable().destroy();
    }
    
    paymentsDataTable = $('#paymentsTable').DataTable({
        columns: [
            { title: "Date" },
            { title: "Paid By" },
            { title: "Paid To" },
            { title: "Amount" },
            { title: "Quantity" },
            { title: "Payment For" },
            { title: "Type" },
            { title: "Comments" },
            { title: "Actions" }
        ],
        responsive: true,
        pageLength: 10
    });
}

// ================= PROJECT FUNCTIONS ================= //

async function createProject() {
  const name = document.getElementById('projectName').value.trim();
  const expectedCost = parseFloat(document.getElementById('expectedCost').value);
  const expectedTime = parseInt(document.getElementById('expectedTime').value);
  const partners = document.getElementById('projectPartners').value.split(',').map(p => p.trim());
  
  if (!name || isNaN(expectedCost) || isNaN(expectedTime) || partners.length === 0) {
    showToast('Please fill all fields correctly', 'error');
    return;
  }
  
  try {
    await db.collection("projects").add({
      name,
      expectedCost,
      expectedTime,
      partners,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Clear form
    document.getElementById('projectName').value = '';
    document.getElementById('expectedCost').value = '';
    document.getElementById('expectedTime').value = '';
    document.getElementById('projectPartners').value = '';
    
    loadProjects();
    showToast('Project created successfully!');
  } catch (error) {
    console.error("Error adding project: ", error);
    showToast("Failed to create project: " + error.message, 'error');
  }
}

async function loadProjects() {
  try {
    const querySnapshot = await db.collection("projects").get();
    const container = document.getElementById('projectsList');
    container.innerHTML = '';
    
    if (querySnapshot.empty) {
      container.innerHTML = '<p>No projects yet. Create your first project!</p>';
      return;
    }

    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());

    projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.style.marginBottom = '15px';
      card.innerHTML = `
        <div>
          <h3>${project.name}</h3>
          <p>Expected: ₹${project.expectedCost?.toLocaleString() || '0'} | ${project.expectedTime || '0'} months</p>
        </div>
        <div class="project-actions">
          <i class="fas fa-edit action-icon edit-icon" onclick="openEditProjectModal('${project.id}', event)"></i>
          <i class="fas fa-trash action-icon delete-icon" onclick="deleteProject('${project.id}', event)"></i>
          <button class="btn btn-primary" onclick="openProject('${project.id}', event)">Open</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading projects: ", error);
    showToast("Failed to load projects: " + error.message, 'error');
  }
}

async function openProject(projectId, event) {
    if (event) event.stopPropagation();
    
    try {
        // Get project document
        const projectDoc = await db.collection("projects").doc(projectId).get();
        if (!projectDoc.exists) {
            showToast("Project not found", 'error');
            return;
        }
        
        currentProject = {
            id: projectId,
            ...projectDoc.data()
        };
        
        // Get payments
        const paymentsQuery = await db.collection("payments")
            .where("projectId", "==", projectId)
            .get();
        
        currentPayments = paymentsQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update UI
        document.getElementById('projectTitle').textContent = currentProject.name;
        document.getElementById('homeScreen').classList.add('hidden');
        document.getElementById('projectScreen').classList.remove('hidden');
        
        // Initialize DataTable before rendering
        initializeDataTable();
        renderPayments();
        updateStatistics();
        
    } catch (error) {
        console.error("Error opening project:", error);
        showToast("Failed to open project: " + error.message, 'error');
    }
}

async function openEditProjectModal(projectId, event) {
  if (event) event.stopPropagation();
  
  try {
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      showToast("Project not found", 'error');
      return;
    }
    
    const project = projectDoc.data();
    editingProjectId = projectId;
    
    // Populate form fields
    document.getElementById('editProjectName').value = project.name || '';
    document.getElementById('editExpectedCost').value = project.expectedCost || '';
    document.getElementById('editExpectedTime').value = project.expectedTime || '';
    document.getElementById('editProjectPartners').value = project.partners ? project.partners.join(', ') : '';
    
    // Show modal
    document.getElementById('editProjectModal').classList.add('active');
  } catch (error) {
    console.error("Error opening edit modal:", error);
    showToast("Failed to load project details: " + error.message, 'error');
  }
}

async function saveProjectChanges() {
  const name = document.getElementById('editProjectName').value.trim();
  const expectedCost = parseFloat(document.getElementById('editExpectedCost').value);
  const expectedTime = parseInt(document.getElementById('editExpectedTime').value);
  const partners = document.getElementById('editProjectPartners').value.split(',').map(p => p.trim());
  
  if (!name || isNaN(expectedCost) || isNaN(expectedTime) || partners.length === 0) {
    showToast('Please fill all fields correctly', 'error');
    return;
  }
  
  try {
    await db.collection("projects").doc(editingProjectId).update({
      name,
      expectedCost,
      expectedTime,
      partners
    });
    
    closeEditModal();
    loadProjects();
    
    // If we're editing the current project, update the display
    if (currentProject && currentProject.id === editingProjectId) {
      const updatedDoc = await db.collection("projects").doc(editingProjectId).get();
      currentProject = {
        id: editingProjectId,
        ...updatedDoc.data()
      };
      document.getElementById('projectTitle').textContent = currentProject.name;
      updateStatistics();
    }
    showToast('Project updated successfully!');
  } catch (error) {
    console.error("Error updating project:", error);
    showToast("Failed to update project: " + error.message, 'error');
  }
}

async function deleteProject(projectId, event) {
  if (event) event.stopPropagation();
  if (!confirm('Are you sure you want to delete this project? All associated payments will also be deleted.')) return;
  
  try {
    // Delete all related payments
    const paymentsQuery = await db.collection("payments")
      .where("projectId", "==", projectId)
      .get();
    
    const batch = db.batch();
    paymentsQuery.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete all related sales
    const salesQuery = await db.collection("sales")
      .where("projectId", "==", projectId)
      .get();
    
    salesQuery.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Delete the project
    await db.collection("projects").doc(projectId).delete();
    
    // If we're deleting the current project, go back to home screen
    if (currentProject && currentProject.id === projectId) {
      showHomeScreen();
    }
    
    loadProjects();
    showToast('Project deleted successfully!');
  } catch (error) {
    console.error("Error deleting project:", error);
    showToast("Failed to delete project: " + error.message, 'error');
  }
}

// ================= PAYMENT FUNCTIONS ================= //

async function addPayment() {
  if (editingPaymentId) {
    await updatePayment();
    return;
  }
  
  const projectId = currentProject.id;
  const paymentData = {
    projectId,
    date: document.getElementById('paymentDate').value,
    paidBy: document.getElementById('paidBy').value,
    paidTo: document.getElementById('paidTo').value.trim(),
    type: document.getElementById('paymentType').value,
    amount: parseFloat(document.getElementById('paymentAmount').value),
    quantity: parseInt(document.getElementById('paymentQuantity').value) || 1,
    paymentFor: document.getElementById('paymentFor').value.trim(),
    comments: document.getElementById('comments').value.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (!paymentData.date || !paymentData.paidBy || isNaN(paymentData.amount) || !paymentData.paymentFor) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    await db.collection("payments").add(paymentData);
    
    // Refresh payments
    const paymentsQuery = await db.collection("payments")
      .where("projectId", "==", projectId)
      .get();
    
    currentPayments = paymentsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    resetPaymentForm();
    renderPayments();
    updateStatistics();
    showToast('Payment added successfully!');
  } catch (error) {
    console.error("Error adding payment:", error);
    showToast("Failed to add payment: " + error.message, 'error');
  }
}

async function updatePayment() {
  const paymentData = {
    date: document.getElementById('paymentDate').value,
    paidBy: document.getElementById('paidBy').value,
    paidTo: document.getElementById('paidTo').value.trim(),
    type: document.getElementById('paymentType').value,
    amount: parseFloat(document.getElementById('paymentAmount').value),
    quantity: parseInt(document.getElementById('paymentQuantity').value) || 1,
    paymentFor: document.getElementById('paymentFor').value.trim(),
    comments: document.getElementById('comments').value.trim()
  };

  if (!paymentData.date || !paymentData.paidBy || isNaN(paymentData.amount) || !paymentData.paymentFor) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    await db.collection("payments").doc(editingPaymentId).update(paymentData);
    
    // Refresh payments
    const paymentsQuery = await db.collection("payments")
      .where("projectId", "==", currentProject.id)
      .get();
    
    currentPayments = paymentsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    resetPaymentForm();
    editingPaymentId = null;
    renderPayments();
    updateStatistics();
    showToast('Payment updated successfully!');
  } catch (error) {
    console.error("Error updating payment:", error);
    showToast("Failed to update payment: " + error.message, 'error');
  }
}

async function startEditPayment(paymentId) {
  try {
    const paymentDoc = await db.collection("payments").doc(paymentId).get();
    if (!paymentDoc.exists) {
      showToast("Payment not found", 'error');
      return;
    }
    
    const payment = paymentDoc.data();
    editingPaymentId = paymentId;
    
    // Fill form with payment data
    document.getElementById('paymentDate').value = payment.date;
    document.getElementById('paidBy').value = payment.paidBy;
    document.getElementById('paidTo').value = payment.paidTo || '';
    document.getElementById('paymentType').value = payment.type || 'material';
    document.getElementById('paymentAmount').value = payment.amount;
    document.getElementById('paymentQuantity').value = payment.quantity || 1;
    document.getElementById('paymentFor').value = payment.paymentFor;
    document.getElementById('comments').value = payment.comments || '';
    
    document.querySelector('#paymentsTab .btn-primary').textContent = 'Update Payment';
    document.getElementById('paymentDate').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error("Error loading payment:", error);
    showToast("Failed to load payment: " + error.message, 'error');
  }
}

async function deletePayment(paymentId) {
  if (!confirm('Are you sure you want to delete this payment?')) return;
  
  try {
    await db.collection("payments").doc(paymentId).delete();
    currentPayments = currentPayments.filter(p => p.id !== paymentId);
    renderPayments();
    updateStatistics();
    showToast('Payment deleted successfully!');
  } catch (error) {
    console.error("Error deleting payment:", error);
    showToast("Failed to delete payment: " + error.message, 'error');
  }
}

// ================= UI FUNCTIONS ================= //

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }, 100);
}

function showHomeScreen() {
  document.getElementById('projectScreen').classList.add('hidden');
  document.getElementById('homeScreen').classList.remove('hidden');
  currentProject = null;
  currentPayments = [];
  currentSale = null;
  loadProjects();
}

function showTab(tabName) {
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('#paymentsTab, #statisticsTab, #profitTab').forEach(tab => tab.classList.add('hidden'));
  
  document.getElementById(`${tabName}Tab`).classList.remove('hidden');
  document.querySelector(`.nav-tab[onclick="showTab('${tabName}')"]`).classList.add('active');
  
  if (tabName === 'statistics') {
    updateStatistics();
  } else if (tabName === 'profit' && currentSale) {
    calculateProfit();
  }
}

function closeEditModal() {
  document.getElementById('editProjectModal').classList.remove('active');
  setTimeout(() => {
    document.getElementById('editProjectName').value = '';
    document.getElementById('editExpectedCost').value = '';
    document.getElementById('editExpectedTime').value = '';
    document.getElementById('editProjectPartners').value = '';
    editingProjectId = null;
  }, 300);
}

function resetPaymentForm() {
  document.getElementById('paidTo').value = '';
  document.getElementById('paymentAmount').value = '';
  document.getElementById('paymentQuantity').value = '1';
  document.getElementById('paymentFor').value = '';
  document.getElementById('comments').value = '';
  document.getElementById('paymentDate').valueAsDate = new Date();
  document.querySelector('#paymentsTab .btn-primary').textContent = 'Add Payment';
  editingPaymentId = null;
}

// ================= DATA TABLE AND CHARTS ================= //

function renderPayments() {
    // Clear and destroy existing DataTable
    if ($.fn.DataTable.isDataTable('#paymentsTable')) {
        paymentsDataTable.clear().destroy();
    }
    
    // Create new DataTable with current payments data
    paymentsDataTable = $('#paymentsTable').DataTable({
        data: currentPayments.map(payment => ({
            date: payment.date,
            paidBy: payment.paidBy,
            paidTo: payment.paidTo || '-',
            amount: `₹${payment.amount?.toLocaleString() || '0'}`,
            quantity: payment.quantity || '1',
            paymentFor: payment.paymentFor || '-',
            type: payment.type || '-',
            comments: payment.comments || '-',
            actions: `
                <i class="fas fa-edit action-icon edit-icon" onclick="startEditPayment('${payment.id}')"></i>
                <i class="fas fa-trash action-icon delete-icon" onclick="deletePayment('${payment.id}')"></i>
            `
        })),
        columns: [
            { data: 'date', title: "Date" },
            { data: 'paidBy', title: "Paid By" },
            { data: 'paidTo', title: "Paid To" },
            { data: 'amount', title: "Amount" },
            { data: 'quantity', title: "Quantity" },
            { data: 'paymentFor', title: "Payment For" },
            { data: 'type', title: "Type" },
            { data: 'comments', title: "Comments" },
            { 
                data: 'actions', 
                title: "Actions",
                orderable: false,
                searchable: false
            }
        ],
        responsive: true,
        pageLength: 10,
        order: [[0, 'desc']],
        initComplete: function() {
            initTableFilters();
        }
    });
}

function updateStatistics() {
  if (!currentProject || !currentPayments.length) return;
  
  const totalSpent = currentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paymentsCount = currentPayments.length;
  const avgPayment = paymentsCount > 0 ? totalSpent / paymentsCount : 0;
  const lastPaymentDate = currentPayments[0]?.date || '-';
  
  document.getElementById('totalSpent').textContent = `₹${totalSpent.toLocaleString()}`;
  document.getElementById('paymentsCount').textContent = paymentsCount;
  document.getElementById('avgPayment').textContent = `₹${avgPayment.toFixed(2)}`;
  document.getElementById('lastPaymentDate').textContent = lastPaymentDate;
  
  // Partner contributions
  const partnerContributions = {};
  const partnerPaymentsCount = {};
  currentProject.partners.forEach(partner => {
    partnerContributions[partner] = 0;
    partnerPaymentsCount[partner] = 0;
  });
  
  currentPayments.forEach(payment => {
    if (payment.paidBy && partnerContributions.hasOwnProperty(payment.paidBy)) {
      partnerContributions[payment.paidBy] += payment.amount || 0;
      partnerPaymentsCount[payment.paidBy]++;
    }
  });
  
  // Calculate average spend per partner
  const partnerAvgSpend = {};
  for (const partner in partnerContributions) {
    partnerAvgSpend[partner] = partnerPaymentsCount[partner] > 0 
      ? partnerContributions[partner] / partnerPaymentsCount[partner]
      : 0;
  }
  
  const contributionsTable = document.getElementById('partnerContributionsTable');
  contributionsTable.innerHTML = '';
  
  for (const partner in partnerContributions) {
    const contribution = partnerContributions[partner];
    const percentage = totalSpent > 0 ? (contribution / totalSpent * 100).toFixed(1) : 0;
    const count = partnerPaymentsCount[partner];
    const avg = partnerAvgSpend[partner];
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${partner}</td>
      <td>₹${contribution.toLocaleString()}</td>
      <td>${count}</td>
      <td>₹${avg.toFixed(2)}</td>
      <td>${percentage}%</td>
    `;
    contributionsTable.appendChild(tr);
  }
  
  // Update average partner spend card
  const totalAvgPartnerSpend = Object.values(partnerAvgSpend).reduce((sum, v) => sum + v, 0) / 
    (Object.keys(partnerAvgSpend).length || 1);
  document.getElementById('avgPartnerSpend').textContent = `₹${totalAvgPartnerSpend.toFixed(2)}`;
  
  renderCharts();
}

function renderCharts() {
  // Destroy existing charts if they exist
  if (partnerChart) partnerChart.destroy();
  if (categoryChart) categoryChart.destroy();
  if (monthlyChart) monthlyChart.destroy();
  if (partnerSpendChart) partnerSpendChart.destroy();
  
  // Partner spending chart
  const partnerData = {};
  currentProject.partners.forEach(partner => {
    partnerData[partner] = 0;
  });
  
  currentPayments.forEach(payment => {
    if (payment.paidBy && partnerData.hasOwnProperty(payment.paidBy)) {
      partnerData[payment.paidBy] += payment.amount || 0;
    }
  });
  
  const partnerCtx = document.getElementById('partnerChart').getContext('2d');
  partnerChart = new Chart(partnerCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(partnerData),
      datasets: [{
        label: 'Total Amount Spent (₹)',
        data: Object.values(partnerData),
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ]
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Amount (₹)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Partners'
          }
        }
      }
    }
  });
  
  // Partner spend chart (pie)
  const partnerSpendCtx = document.getElementById('partnerSpendChart').getContext('2d');
  partnerSpendChart = new Chart(partnerSpendCtx, {
    type: 'pie',
    data: {
      labels: Object.keys(partnerData),
      datasets: [{
        data: Object.values(partnerData),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Partner Spending Distribution'
        }
      }
    }
  });
  
  // Category spending chart
  const categoryData = {};
  currentPayments.forEach(payment => {
    const category = payment.paymentFor || 'Other';
    categoryData[category] = (categoryData[category] || 0) + (payment.amount || 0);
  });
  
  const categoryCtx = document.getElementById('categoryChart').getContext('2d');
  categoryChart = new Chart(categoryCtx, {
    type: 'pie',
    data: {
      labels: Object.keys(categoryData),
      datasets: [{
        data: Object.values(categoryData),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Category Spending Distribution'
        }
      }
    }
  });
  
  // Monthly spending chart (fixed)
  const monthlyData = {};
  currentPayments.forEach(payment => {
    if (payment.date) {
      const date = new Date(payment.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthYear] = (monthlyData[monthYear] || 0) + (payment.amount || 0);
    }
  });
  
  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
    const [yearA, monthA] = a.split('-').map(Number);
    const [yearB, monthB] = b.split('-').map(Number);
    return yearA - yearB || monthA - monthB;
  });
  
  // Format month labels for display
  const monthLabels = sortedMonths.map(month => {
    const [year, monthNum] = month.split('-');
    const monthName = new Date(`${year}-${monthNum}-01`).toLocaleString('default', { month: 'short' });
    return `${monthName} ${year}`;
  });
  
  const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
  monthlyChart = new Chart(monthlyCtx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Monthly Spending (₹)',
        data: sortedMonths.map(m => monthlyData[m]),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Amount (₹)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Month'
          }
        }
      }
    }
  });
}

async function calculateProfit() {
  const date = document.getElementById('saleDate').value;
  const amount = parseFloat(document.getElementById('saleAmount').value);
  const additionalCosts = parseFloat(document.getElementById('additionalCosts').value) || 0;
  
  if (!date || isNaN(amount)) {
    showToast('Please enter valid sale details', 'error');
    return;
  }
  
  try {
    // Save or update sale data
    if (currentSale) {
      await db.collection("sales").doc(currentSale.id).update({ 
        date, 
        amount, 
        additionalCosts 
      });
    } else {
      const docRef = await db.collection("sales").add({
        projectId: currentProject.id,
        date,
        amount,
        additionalCosts,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      currentSale = {
        id: docRef.id,
        projectId: currentProject.id,
        date,
        amount,
        additionalCosts
      };
    }
    
    // Calculate profit distribution
    const totalSpent = currentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalInvestment = totalSpent + additionalCosts;
    const netProfit = amount - totalInvestment;
    
    // Calculate partner contributions
    const partnerContributions = {};
    currentProject.partners.forEach(partner => {
      partnerContributions[partner] = 0;
    });
    
    currentPayments.forEach(payment => {
      if (payment.paidBy && partnerContributions.hasOwnProperty(payment.paidBy)) {
        partnerContributions[payment.paidBy] += payment.amount || 0;
      }
    });
    
    const totalContributed = Object.values(partnerContributions).reduce((sum, v) => sum + v, 0);
    
    // Update UI
    document.getElementById('totalInvestment').textContent = `₹${totalInvestment.toLocaleString()}`;
    document.getElementById('totalSale').textContent = `₹${amount.toLocaleString()}`;
    document.getElementById('netProfit').textContent = `₹${netProfit.toLocaleString()}`;
    
    const distributionTable = document.getElementById('profitDistributionTable');
    distributionTable.innerHTML = '';
    
    for (const partner in partnerContributions) {
      const contribution = partnerContributions[partner];
      const sharePercent = totalContributed > 0 ? (contribution / totalContributed * 100).toFixed(1) : 0;
      const profitShare = totalContributed > 0 ? (netProfit * (contribution / totalContributed)).toFixed(2) : 0;
      const totalReturn = (parseFloat(contribution) + parseFloat(profitShare)).toFixed(2);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${partner}</td>
        <td>₹${contribution.toLocaleString()}</td>
        <td>${sharePercent}%</td>
        <td>₹${profitShare}</td>
        <td>₹${totalReturn}</td>
      `;
      distributionTable.appendChild(tr);
    }
    
    document.getElementById('profitResults').style.display = 'block';
    showToast('Profit calculation updated!');
  } catch (error) {
    console.error("Error calculating profit:", error);
    showToast("Failed to calculate profit: " + error.message, 'error');
  }
}

function resetFilters() {
  $('#paidByFilter').val('').trigger('change');
  $('#dateFilter').val('');
  if (paymentsDataTable) {
    paymentsDataTable.search('').columns().search('').draw();
  }
}