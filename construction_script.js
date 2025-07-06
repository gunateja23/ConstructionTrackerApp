// // Database setup
// const db = new Dexie("ConstructionPaymentTracker");
// db.version(1).stores({
//     projects: "++id,name,expectedCost,expectedTime,partners,createdAt",
//     payments: "++id,projectId,date,paidBy,paidTo,type,amount,paymentFor,description,comments,createdAt",
//     sales: "++id,projectId,date,amount,additionalCosts,createdAt"
// });

// Firebase configuration (replace with your own)
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
//   firebase.initializeApp(firebaseConfig);
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


db.settings({ 
    experimentalForceLongPolling: true, // Add for problematic networks
    merge: true
});
firebase.firestore().enablePersistence()
  .then(() => console.log("Offline persistence enabled"))
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser does not support all features required for persistence");
    }
  });
// Add to your initialization code
db.enableNetwork().catch(() => {
  console.log("Offline mode enabled");
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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadProjects();
    document.getElementById('paymentDate').valueAsDate = new Date();
    document.getElementById('saleDate').valueAsDate = new Date();
});

// Project functions
// async function createProject() {
//     const name = document.getElementById('projectName').value.trim();
//     const expectedCost = parseFloat(document.getElementById('expectedCost').value);
//     const expectedTime = parseInt(document.getElementById('expectedTime').value);
//     const partners = document.getElementById('projectPartners').value.split(',').map(p => p.trim());
    
//     if (!name || isNaN(expectedCost) || isNaN(expectedTime) || partners.length === 0) {
//         alert('Please fill all fields correctly');
//         return;
//     }
    
//     try {
//         const id = await db.projects.add({
//             name,
//             expectedCost,
//             expectedTime,
//             partners,
//             createdAt: new Date()
//         });
        
//         // Clear form
//         document.getElementById('projectName').value = '';
//         document.getElementById('expectedCost').value = '';
//         document.getElementById('expectedTime').value = '';
//         document.getElementById('projectPartners').value = '';
        
//         loadProjects();
//     } catch (error) {
//         console.error("Error creating project:", error);
//         alert('Failed to create project');
//     }
// }

//newly added code for firebase
async function createProject() {
  const name = document.getElementById('projectName').value.trim();
  const expectedCost = parseFloat(document.getElementById('expectedCost').value);
  const expectedTime = parseInt(document.getElementById('expectedTime').value);
  const partners = document.getElementById('projectPartners').value.split(',').map(p => p.trim());
  
  try {
    const docRef = await db.collection("projects").add({
      name,
      expectedCost,
      expectedTime,
      partners,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Project created with ID: ", docRef.id);
    loadProjects();
  } catch (error) {
    console.error("Error adding project: ", error);
  }
}

//newly added code for firebase loading projects
// async function loadProjects() {
//   try {
//     const querySnapshot = await db.collection("projects").get();
//     const container = document.getElementById('projectsList');
//     container.innerHTML = '';
    
//     querySnapshot.forEach((doc) => {
//       const project = doc.data();
//       const card = document.createElement('div');
//       card.className = 'project-card';
//       card.innerHTML = `
//         <div>
//           <h3>${project.name}</h3>
//           <p>Expected: ₹${project.expectedCost.toLocaleString()} | ${project.expectedTime} months</p>
//         </div>
//         <div class="project-actions">
//           <i class="fas fa-edit action-icon edit-icon" onclick="openEditProjectModal('${doc.id}', event)"></i>
//           <i class="fas fa-trash action-icon delete-icon" onclick="deleteProject('${doc.id}', event)"></i>
//           <button class="btn btn-primary" onclick="openProject('${doc.id}', event)">Open</button>
//         </div>
//       `;
//       container.appendChild(card);
//     });
//   } catch (error) {
//     console.error("Error loading projects: ", error);
//   }
// }

async function loadProjects() {
  return firestoreOperation(async () => {
    const querySnapshot = await db.collection("projects").get();
    const container = document.getElementById('projectsList');
    container.innerHTML = '';
    
    if (querySnapshot.empty) {
      container.innerHTML = '<p>No projects yet. Create your first project!</p>';
      return;
    }

    querySnapshot.forEach((doc) => {
      const project = doc.data();
      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div>
          <h3>${project.name}</h3>
          <p>Expected: ₹${project.expectedCost?.toLocaleString() || '0'} | ${project.expectedTime || '0'} months</p>
        </div>
        <div class="project-actions">
          <i class="fas fa-edit action-icon edit-icon" onclick="openEditProjectModal('${doc.id}', event)"></i>
          <i class="fas fa-trash action-icon delete-icon" onclick="deleteProject('${doc.id}', event)"></i>
          <button class="btn btn-primary" onclick="openProject('${doc.id}', event)">Open</button>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

//add connection monitoring 

// Add connection state monitoring

// const connectionRef = db.ref('.info/connected');

// connectionRef.on('value', (snap) => {
//   if (snap.val() === true) {
//     console.log("Connected to Firestore");
//     document.getElementById('connection-status').textContent = 'Online';
//     document.getElementById('connection-status').style.color = 'green';
//   } else {
//     console.log("Disconnected from Firestore");
//     document.getElementById('connection-status').textContent = 'Offline';
//     document.getElementById('connection-status').style.color = 'red';
//   }
// });
// Monitor connection state
// db.onSnapshotsInSync(() => {
//   console.log("Firestore sync complete");
//   document.getElementById('sync-status').textContent = 'Online';
//   document.getElementById('sync-status').style.color = 'green';
// });

// firebase.firestore().disableNetwork().then(() => {
//   console.log("Offline mode");
//   document.getElementById('sync-status').textContent = 'Offline';
//   document.getElementById('sync-status').style.color = 'red';
// });

// async function loadProjects() {
//     try {
//         const projects = await db.projects.toArray();
//         const container = document.getElementById('projectsList');
        
//         container.innerHTML = '';
        
//         if (projects.length === 0) {
//             container.innerHTML = '<p>No projects yet. Create your first project!</p>';
//             return;
//         }
        
//         projects.forEach(project => {
//             const card = document.createElement('div');
//             card.className = 'project-card';
//             card.innerHTML = `
//                 <div>
//                     <h3>${project.name}</h3>
//                     <p>Expected: ₹${project.expectedCost.toLocaleString()} | ${project.expectedTime} months</p>
//                 </div>
//                 <div class="project-actions">
//                     <i class="fas fa-edit action-icon edit-icon" onclick="openEditProjectModal(${project.id}, event)"></i>
//                     <i class="fas fa-trash action-icon delete-icon" onclick="deleteProject(${project.id}, event)"></i>
//                     <button class="btn btn-primary" onclick="openProject(${project.id}, event)">Open</button>
//                 </div>
//             `;
//             container.appendChild(card);
//         });
//     } catch (error) {
//         console.error("Error loading projects:", error);
//     }
// }

async function openProject(projectId, event) {
    if (event) event.stopPropagation();
    try {
        currentProject = await db.projects.get(projectId);
        currentPayments = await db.payments.where('projectId').equals(projectId).toArray();
        currentSale = await db.sales.where('projectId').equals(projectId).first();
        
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
            document.getElementById('additionalCosts').value = currentSale.additionalCosts;
            calculateProfit();
        }
    } catch (error) {
        console.error("Error opening project:", error);
    }
}
// First, make sure you have these imports at the top of your file

async function openEditProjectModal(projectId, event) {
    alert("Edit project modal opened");
    if (event) event.stopPropagation();
    try {
        // Create document reference
        const projectRef = doc(db, "projects", projectId);
        
        // Get document snapshot
        const projectSnap = await getDoc(projectRef);
        
        if (!projectSnap.exists()) {
            console.log("No such project!");
            return;
        }
        
        // Get project data
        const project = projectSnap.data();
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
        alert("Failed to load project details. Please try again.");
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
        await db.projects.update(editingProjectId, {
            name,
            expectedCost,
            expectedTime,
            partners
        });
        
        closeEditModal();
        loadProjects();
        
        // If we're editing the current project, update the display
        if (currentProject && currentProject.id === editingProjectId) {
            currentProject = await db.projects.get(editingProjectId);
            document.getElementById('projectTitle').textContent = currentProject.name;
            updateStatistics();
        }
    } catch (error) {
        console.error("Error updating project:", error);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editProjectModal');
    modal.classList.remove('active');
    
    // Reset form after animation completes
    setTimeout(() => {
        document.getElementById('editProjectName').value = '';
        document.getElementById('editExpectedCost').value = '';
        document.getElementById('editExpectedTime').value = '';
        document.getElementById('editProjectPartners').value = '';
        editingProjectId = null;
    }, 300); // Match this with your CSS transition duration
}

async function deleteProject(projectId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? All associated payments will also be deleted.')) return;
    
    try {
        // Delete all related payments and sales first
        await db.payments.where('projectId').equals(projectId).delete();
        await db.sales.where('projectId').equals(projectId).delete();
        
        // Then delete the project
        await db.projects.delete(projectId);
        
        // If we're deleting the current project, go back to home screen
        if (currentProject && currentProject.id === projectId) {
            showHomeScreen();
        }
        
        loadProjects();
    } catch (error) {
        console.error("Error deleting project:", error);
    }
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
    }
}

// Payment functions
// async function addPayment() {
//     if (editingPaymentId) {
//         await updatePayment();
//         return;
//     }
    
//     const date = document.getElementById('paymentDate').value;
//     const paidBy = document.getElementById('paidBy').value;
//     const paidTo = document.getElementById('paidTo').value.trim();
//     const type = document.getElementById('paymentType').value;
//     const amount = parseFloat(document.getElementById('paymentAmount').value);
//     const paymentFor = document.getElementById('paymentFor').value.trim();
//     const description = document.getElementById('description').value.trim();
//     const comments = document.getElementById('comments').value.trim();
    
//     if (!date || !paidBy || !paidTo || isNaN(amount) || !paymentFor) {
//         alert('Please fill all required fields');
//         return;
//     }
    
//     try {
//         await db.payments.add({
//             projectId: currentProject.id,
//             date,
//             paidBy,
//             paidTo,
//             type,
//             amount,
//             paymentFor,
//             description,
//             comments,
//             createdAt: new Date()
//         });
        
//         // Refresh data
//         currentPayments = await db.payments.where('projectId').equals(currentProject.id).toArray();
        
//         // Clear form
//         resetPaymentForm();
        
//         renderPayments();
//         updateStatistics();
//     } catch (error) {
//         console.error("Error adding payment:", error);
//     }
// }

// newly added code for firebase payment
async function addPayment() {
  return firestoreOperation(async () => {
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

    if (!paymentData.date || !paymentData.paidBy || isNaN(paymentData.amount)) {
      throw new Error("Please fill all required fields");
    }

    await db.collection("payments").add(paymentData);
    resetPaymentForm();
    renderPayments();
    updateStatistics();
  });
}

async function updatePayment() {
    const date = document.getElementById('paymentDate').value;
    const paidBy = document.getElementById('paidBy').value;
    const paidTo = document.getElementById('paidTo').value.trim();
    const type = document.getElementById('paymentType').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const paymentFor = document.getElementById('paymentFor').value.trim();
    const description = document.getElementById('description').value.trim();
    const comments = document.getElementById('comments').value.trim();
    
    if (!date || !paidBy || !paidTo || isNaN(amount) || !paymentFor) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        await db.payments.update(editingPaymentId, {
            date,
            paidBy,
            paidTo,
            type,
            amount,
            paymentFor,
            description,
            comments
        });
        
        // Refresh data
        currentPayments = await db.payments.where('projectId').equals(currentProject.id).toArray();
        
        // Clear form and reset editing state
        resetPaymentForm();
        editingPaymentId = null;
        
        renderPayments();
        updateStatistics();
    } catch (error) {
        console.error("Error updating payment:", error);
    }
}

function resetPaymentForm() {
    document.getElementById('paidTo').value = '';
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentFor').value = '';
    document.getElementById('description').value = '';
    document.getElementById('comments').value = '';
    document.getElementById('paymentDate').valueAsDate = new Date();
    document.querySelector('#paymentsTab .btn-primary').textContent = 'Add Payment';
}

async function startEditPayment(paymentId) {
    const payment = await db.payments.get(paymentId);
    if (!payment) return;
    
    editingPaymentId = paymentId;
    
    // Fill form with payment data
    document.getElementById('paymentDate').value = payment.date;
    document.getElementById('paidBy').value = payment.paidBy;
    document.getElementById('paidTo').value = payment.paidTo;
    document.getElementById('paymentType').value = payment.type;
    document.getElementById('paymentAmount').value = payment.amount;
    document.getElementById('paymentFor').value = payment.paymentFor;
    document.getElementById('description').value = payment.description;
    document.getElementById('comments').value = payment.comments;
    
    document.querySelector('#paymentsTab .btn-primary').textContent = 'Update Payment';
    
    // Scroll to form
    document.getElementById('paymentDate').scrollIntoView({ behavior: 'smooth' });
}

async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    
    try {
        await db.payments.delete(paymentId);
        currentPayments = currentPayments.filter(p => p.id !== paymentId);
        renderPayments();
        updateStatistics();
    } catch (error) {
        console.error("Error deleting payment:", error);
    }
}

function renderPayments() {
    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#paymentsTable')) {
        $('#paymentsTable').DataTable().destroy();
    }
    
    // Clear the table body
    $('#paymentsTable tbody').empty();
    
    // Populate the table with data
    const table = $('#paymentsTable').DataTable({
        data: currentPayments.map(payment => ({
            date: payment.date,
            paidBy: payment.paidBy,
            paidTo: payment.paidTo,
            amount: payment.amount,
            paymentFor: payment.paymentFor,
            type: payment.type,
            id: payment.id
        })),
        columns: [
            { 
                data: 'date',
                title: "Date",
                render: function(data, type, row) {
                    if (type === 'sort' || type === 'filter') return new Date(data).getTime();
                    return data;
                }
            },
            { 
                data: 'paidBy',
                title: "Paid By"
            },
            { 
                data: 'paidTo',
                title: "Paid To"
            },
            { 
                data: 'amount',
                title: "Amount",
                render: function(data, type, row) {
                    if (type === 'sort' || type === 'filter') return data;
                    return `₹${data.toLocaleString()}`;
                }
            },
            { 
                data: 'paymentFor',
                title: "Payment For"
            },
            { 
                data: 'type',
                title: "Type"
            },
            { 
                title: "Actions",
                orderable: false,
                searchable: false,
                render: function(data, type, row) {
                    return `
                        <i class="fas fa-edit action-icon edit-icon" onclick="startEditPayment(${row.id})"></i>
                        <i class="fas fa-trash action-icon delete-icon" onclick="deletePayment(${row.id})"></i>
                    `;
                }
            }
        ],
        order: [[0, 'desc']], // Sort by date descending by default
        responsive: true,
        pageLength: 10,
        lengthMenu: [5, 10, 25, 50, 100],
        initComplete: function() {
            // Initialize the paidBy filter dropdown
            const paidByFilter = $('#paidByFilter');
            paidByFilter.empty().append('<option value="">All</option>');
            
            if (currentProject && currentProject.partners) {
                currentProject.partners.forEach(partner => {
                    paidByFilter.append(`<option value="${partner}">${partner}</option>`);
                });
            }
            
            // Apply filter when dropdown changes
            paidByFilter.on('change', function() {
                table.column(1).search(this.value).draw();
            });
            
            // Apply filter when date changes
            $('#dateFilter').on('change', function() {
                if (this.value) {
                    table.column(0).search(this.value).draw();
                } else {
                    table.column(0).search('').draw();
                }
            });
        }
    });
    
    paymentsDataTable = table;
}

function resetFilters() {
    $('#paidByFilter').val('').trigger('change');
    $('#dateFilter').val('');
    if (paymentsDataTable) {
        paymentsDataTable.search('').columns().search('').draw();
    }
}

// Statistics functions
function updateStatistics() {
    if (!currentProject || !currentPayments.length) return;
    
    const totalSpent = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const paymentsCount = currentPayments.length;
    const avgPayment = totalSpent / paymentsCount;
    const lastPaymentDate = currentPayments[0]?.date || '-';
    
    document.getElementById('totalSpent').textContent = `₹${totalSpent.toLocaleString()}`;
    document.getElementById('paymentsCount').textContent = paymentsCount;
    document.getElementById('avgPayment').textContent = `₹${avgPayment.toFixed(2)}`;
    document.getElementById('lastPaymentDate').textContent = lastPaymentDate;
    
    // Update partner contributions table
    const partnerContributions = {};
    const partnerPaymentsCount = {};
    
    currentProject.partners.forEach(partner => {
        partnerContributions[partner] = 0;
        partnerPaymentsCount[partner] = 0;
    });
    
    currentPayments.forEach(payment => {
        partnerContributions[payment.paidBy] += payment.amount;
        partnerPaymentsCount[payment.paidBy]++;
    });
    
    const contributionsTable = document.getElementById('partnerContributionsTable');
    contributionsTable.innerHTML = '';
    
    for (const partner in partnerContributions) {
        const contribution = partnerContributions[partner];
        const percentage = (contribution / totalSpent * 100).toFixed(1);
        const count = partnerPaymentsCount[partner];
        
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
    // Partner spending chart
    const partnerData = {};
    currentProject.partners.forEach(partner => {
        partnerData[partner] = 0;
    });
    
    currentPayments.forEach(payment => {
        partnerData[payment.paidBy] += payment.amount;
    });
    
    const partnerCtx = document.getElementById('partnerChart').getContext('2d');
    if (partnerChart) partnerChart.destroy();
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
        categoryData[payment.paymentFor] = (categoryData[payment.paymentFor] || 0) + payment.amount;
    });
    
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChart) categoryChart.destroy();
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
        const monthYear = payment.date.substring(0, 7); // YYYY-MM
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + payment.amount;
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChart) monthlyChart.destroy();
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


//error handling for Firestore operations
async function firestoreOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    console.error("Firestore error:", error);
    if (error.code === 'unavailable') {
      alert("You're offline. Changes will sync when you reconnect.");
    } else {
      alert(`Error: ${error.message}`);
    }
    throw error;
  }
}

// Profit calculation functions
async function calculateProfit() {
    const date = document.getElementById('saleDate').value;
    const amount = parseFloat(document.getElementById('saleAmount').value);
    const additionalCosts = parseFloat(document.getElementById('additionalCosts').value) || 0;
    
    if (!date || isNaN(amount)) {
        alert('Please enter valid sale details');
        return;
    }
    
    try {
        // Save sale data
        if (currentSale) {
            await db.sales.update(currentSale.id, { date, amount, additionalCosts });
            currentSale = await db.sales.get(currentSale.id);
        } else {
            const id = await db.sales.add({
                projectId: currentProject.id,
                date,
                amount,
                additionalCosts,
                createdAt: new Date()
            });
            currentSale = await db.sales.get(id);
        }
        
        // Calculate profit distribution
        const totalSpent = currentPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalInvestment = totalSpent + additionalCosts;
        const netProfit = currentSale.amount - totalInvestment;
        
        // Calculate partner contributions
        const partnerContributions = {};
        currentProject.partners.forEach(partner => {
            partnerContributions[partner] = 0;
        });
        
        currentPayments.forEach(payment => {
            partnerContributions[payment.paidBy] += payment.amount;
        });
        
        const totalContributed = Object.values(partnerContributions).reduce((sum, v) => sum + v, 0);
        
        // Update UI
        document.getElementById('totalInvestment').textContent = `₹${totalInvestment.toLocaleString()}`;
        document.getElementById('totalSale').textContent = `₹${currentSale.amount.toLocaleString()}`;
        document.getElementById('netProfit').textContent = `₹${netProfit.toLocaleString()}`;
        
        const distributionTable = document.getElementById('profitDistributionTable');
        distributionTable.innerHTML = '';
        
        for (const partner in partnerContributions) {
            const contribution = partnerContributions[partner];
            const sharePercent = (contribution / totalContributed * 100).toFixed(1);
            const profitShare = (netProfit * (contribution / totalContributed)).toFixed(2);
            const totalReturn = (parseFloat(contribution) + parseFloat(profitShare)).toFixed(2);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${partner}</td>
                <td>₹${contribution.toLocaleString()}</td>
                <td>${sharePercent}%</td>
                <td>₹${profitShare.toLocaleString()}</td>
                <td>₹${totalReturn.toLocaleString()}</td>
            `;
            distributionTable.appendChild(tr);
        }
        
        document.getElementById('profitResults').style.display = 'block';
    } catch (error) {
        console.error("Error calculating profit:", error);
    }
}