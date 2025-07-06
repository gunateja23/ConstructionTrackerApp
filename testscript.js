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
let partnerChart = null;
let categoryChart = null;
let monthlyChart = null;
let editingPaymentId = null;
let editingProjectId = null;
let paymentsDataTable = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadProjects();
    document.getElementById('paymentDate').valueAsDate = new Date();
    document.getElementById('saleDate').valueAsDate = new Date();

      // Add background style
});

document.addEventListener('DOMContentLoaded', function() {
    // Set background image with opacity
    document.body.style.backgroundImage = "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundPosition = "center";
    
    // Make content areas slightly transparent
    // const contentAreas = document.querySelectorAll('.container, .modal-content, .project-card, #paymentsTab, #statisticsTab, #profitTab');
    
    const contentAreas = document.querySelectorAll('.container, .modal-content')
    contentAreas.forEach(area => {
        area.style.backgroundColor = "rgba(188, 200, 224, 0.85)";
        area.style.borderRadius = "8px";
        area.style.padding = "15px";
        area.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
    });
    
    loadProjects();
    document.getElementById('paymentDate').valueAsDate = new Date();
    document.getElementById('saleDate').valueAsDate = new Date();
});


// ================= PROJECT FUNCTIONS ================= //

async function createProject() {
  const name = document.getElementById('projectName').value.trim();
  const expectedCost = parseFloat(document.getElementById('expectedCost').value);
  const expectedTime = parseInt(document.getElementById('expectedTime').value);
  const partners = document.getElementById('projectPartners').value.split(',').map(p => p.trim());
  
  if (!name || isNaN(expectedCost) || isNaN(expectedTime) || partners.length === 0) {
    alert('Please fill all fields correctly');
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
  } catch (error) {
    console.error("Error adding project: ", error);
    alert("Failed to create project: " + error.message);
  }
}

async function loadProjects() {
  try {
    // Simple query doesn't require index
    const querySnapshot = await db.collection("projects").get();
    const container = document.getElementById('projectsList');
    container.innerHTML = '';
    
    if (querySnapshot.empty) {
      container.innerHTML = '<p>No projects yet. Create your first project!</p>';
      return;
    }

    // Convert to array and sort client-side
    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());

    projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'project-card';
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
    alert("Failed to load projects: " + error.message);
  }
}

async function openProject(projectId, event) {
  if (event) event.stopPropagation();
  
  try {
    // Get project document
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      alert("Project not found");
      return;
    }
    
    currentProject = {
      id: projectId,
      ...projectDoc.data()
    };
    
    // Get payments - simple query without ordering to avoid index requirement
    const paymentsQuery = await db.collection("payments")
      .where("projectId", "==", projectId)
      .get();
    
    // Sort payments by date client-side
    currentPayments = paymentsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Get sale if exists
    const saleQuery = await db.collection("sales")
      .where("projectId", "==", projectId)
      .limit(1)
      .get();
    
    currentSale = saleQuery.empty ? null : {
      id: saleQuery.docs[0].id,
      ...saleQuery.docs[0].data()
    };
    
    // Update UI
    document.getElementById('projectTitle').textContent = currentProject.name;
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('projectScreen').classList.remove('hidden');
    
    // Update partner dropdown
    const paidBySelect = document.getElementById('paidBy');
    paidBySelect.innerHTML = '';
    currentProject.partners.forEach(partner => {
      const option = document.createElement('option');
      option.value = partner;
      option.textContent = partner;
      paidBySelect.appendChild(option);
    });
    
    renderPayments();
    updateStatistics();
    
    if (currentSale) {
      document.getElementById('saleDate').value = currentSale.date;
      document.getElementById('saleAmount').value = currentSale.amount;
      document.getElementById('additionalCosts').value = currentSale.additionalCosts || 0;
      calculateProfit();
    }
  } catch (error) {
    console.error("Error opening project:", error);
    alert("Failed to open project: " + error.message);
  }
}

async function openEditProjectModal(projectId, event) {
  if (event) event.stopPropagation();
  
  try {
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      alert("Project not found");
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
    alert("Failed to load project details: " + error.message);
  }
}

async function saveProjectChanges() {
  const name = document.getElementById('editProjectName').value.trim();
  const expectedCost = parseFloat(document.getElementById('editExpectedCost').value);
  const expectedTime = parseInt(document.getElementById('editExpectedTime').value);
  const partners = document.getElementById('editProjectPartners').value.split(',').map(p => p.trim());
  
  if (!name || isNaN(expectedCost) || isNaN(expectedTime) || partners.length === 0) {
    alert('Please fill all fields correctly');
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
  } catch (error) {
    console.error("Error updating project:", error);
    alert("Failed to update project: " + error.message);
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
  } catch (error) {
    console.error("Error deleting project:", error);
    alert("Failed to delete project: " + error.message);
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
    paymentFor: document.getElementById('paymentFor').value.trim(),
    description: document.getElementById('description').value.trim(),
    comments: document.getElementById('comments').value.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (!paymentData.date || !paymentData.paidBy || isNaN(paymentData.amount) || !paymentData.paymentFor) {
    alert('Please fill all required fields');
    return;
  }

  try {
    await db.collection("payments").add(paymentData);
    
    // Refresh payments (simple query without ordering)
    const paymentsQuery = await db.collection("payments")
      .where("projectId", "==", projectId)
      .get();
    
    currentPayments = paymentsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => new Date(b.date) - new Date(a.date)); // Client-side sort
    
    resetPaymentForm();
    renderPayments();
    updateStatistics();
  } catch (error) {
    console.error("Error adding payment:", error);
    alert("Failed to add payment: " + error.message);
  }
}

async function updatePayment() {
  const paymentData = {
    date: document.getElementById('paymentDate').value,
    paidBy: document.getElementById('paidBy').value,
    paidTo: document.getElementById('paidTo').value.trim(),
    type: document.getElementById('paymentType').value,
    amount: parseFloat(document.getElementById('paymentAmount').value),
    paymentFor: document.getElementById('paymentFor').value.trim(),
    description: document.getElementById('description').value.trim(),
    comments: document.getElementById('comments').value.trim()
  };

  if (!paymentData.date || !paymentData.paidBy || isNaN(paymentData.amount) || !paymentData.paymentFor) {
    alert('Please fill all required fields');
    return;
  }

  try {
    await db.collection("payments").doc(editingPaymentId).update(paymentData);
    
    // Refresh payments (simple query without ordering)
    const paymentsQuery = await db.collection("payments")
      .where("projectId", "==", currentProject.id)
      .get();
    
    currentPayments = paymentsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => new Date(b.date) - new Date(a.date)); // Client-side sort
    
    resetPaymentForm();
    editingPaymentId = null;
    renderPayments();
    updateStatistics();
  } catch (error) {
    console.error("Error updating payment:", error);
    alert("Failed to update payment: " + error.message);
  }
}

async function startEditPayment(paymentId) {
  try {
    const paymentDoc = await db.collection("payments").doc(paymentId).get();
    if (!paymentDoc.exists) {
      alert("Payment not found");
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
    document.getElementById('paymentFor').value = payment.paymentFor;
    document.getElementById('description').value = payment.description || '';
    document.getElementById('comments').value = payment.comments || '';
    
    document.querySelector('#paymentsTab .btn-primary').textContent = 'Update Payment';
    document.getElementById('paymentDate').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error("Error loading payment:", error);
    alert("Failed to load payment: " + error.message);
  }
}

async function deletePayment(paymentId) {
  if (!confirm('Are you sure you want to delete this payment?')) return;
  
  try {
    await db.collection("payments").doc(paymentId).delete();
    currentPayments = currentPayments.filter(p => p.id !== paymentId);
    renderPayments();
    updateStatistics();
  } catch (error) {
    console.error("Error deleting payment:", error);
    alert("Failed to delete payment: " + error.message);
  }
}

// ================= UI FUNCTIONS ================= //

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
  document.getElementById('paymentFor').value = '';
  document.getElementById('description').value = '';
  document.getElementById('comments').value = '';
  document.getElementById('paymentDate').valueAsDate = new Date();
  document.querySelector('#paymentsTab .btn-primary').textContent = 'Add Payment';
  editingPaymentId = null;
}

// ================= DATA TABLE AND CHARTS ================= //

function renderPayments() {
  if ($.fn.DataTable.isDataTable('#paymentsTable')) {
    $('#paymentsTable').DataTable().destroy();
  }
  
  const table = $('#paymentsTable').DataTable({
    data: currentPayments,
    columns: [
      { 
        data: 'date',
        title: "Date",
        render: function(data, type, row) {
          if (type === 'sort' || type === 'filter') return new Date(data).getTime();
          return data;
        }
      },
      { data: 'paidBy', title: "Paid By" },
      { data: 'paidTo', title: "Paid To" },
      { 
        data: 'amount',
        title: "Amount",
        render: function(data, type, row) {
          if (type === 'sort' || type === 'filter') return data;
          return `₹${data?.toLocaleString() || '0'}`;
        }
      },
      { data: 'paymentFor', title: "Payment For" },
      {data : 'comments', title: "Quantity"},
      {data: 'description', title: "Description"},
      { data: 'type', title: "Payment Type" },
      { 
        title: "Actions",
        orderable: false,
        searchable: false,
        render: function(data, type, row) {
          return `
            <i class="fas fa-edit action-icon edit-icon" onclick="startEditPayment('${row.id}')"></i>
            <i class="fas fa-trash action-icon delete-icon" onclick="deletePayment('${row.id}')"></i>
          `;
        }
      }
    ],
    order: [[0, 'desc']],
    responsive: true,
    pageLength: 10,
    initComplete: function() {
      const paidByFilter = $('#paidByFilter');
      paidByFilter.empty().append('<option value="">All</option>');
      
      if (currentProject?.partners) {
        currentProject.partners.forEach(partner => {
          paidByFilter.append(`<option value="${partner}">${partner}</option>`);
        });
      }
      
      paidByFilter.on('change', function() {
        table.column(1).search(this.value).draw();
      });
      
      $('#dateFilter').on('change', function() {
        table.column(0).search(this.value).draw();
      });
    }
  });
  
  paymentsDataTable = table;
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
  
  // Partner contributions - now tracking both amount and count
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
  
  const contributionsTable = document.getElementById('partnerContributionsTable');
  contributionsTable.innerHTML = '';
  
  for (const partner in partnerContributions) {
    const contribution = partnerContributions[partner];
    const count = partnerPaymentsCount[partner];
    const percentage = totalSpent > 0 ? (contribution / totalSpent * 100).toFixed(1) : 0;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${partner}</td>
      <td>₹${contribution.toLocaleString()}</td>
      <td>${percentage}%</td>
      <td>${count}</td>
    `;
    contributionsTable.appendChild(tr);
  }
  
  renderCharts();
}

function renderCharts() {
  // Destroy existing charts if they exist
  if (partnerChart) partnerChart.destroy();
  if (categoryChart) categoryChart.destroy();
  if (monthlyChart) monthlyChart.destroy();
  
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
        label: 'Amount Spent (₹)',
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
          beginAtZero: true
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
    }
  });
  
  // Monthly spending chart
  const monthlyData = {};
  currentPayments.forEach(payment => {
    if (payment.date) {
      const monthYear = payment.date.substring(0, 7); // YYYY-MM
      monthlyData[monthYear] = (monthlyData[monthYear] || 0) + (payment.amount || 0);
    }
  });
  
  const sortedMonths = Object.keys(monthlyData).sort();
  const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
  monthlyChart = new Chart(monthlyCtx, {
    type: 'line',
    data: {
      labels: sortedMonths,
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
          beginAtZero: true
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
    alert('Please enter valid sale details');
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
  } catch (error) {
    console.error("Error calculating profit:", error);
    alert("Failed to calculate profit: " + error.message);
  }
}

function resetFilters() {
  $('#paidByFilter').val('').trigger('change');
  $('#dateFilter').val('');
  if (paymentsDataTable) {
    paymentsDataTable.search('').columns().search('').draw();
  }
}