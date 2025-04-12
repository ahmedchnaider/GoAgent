// Import the Firebase client - using the main firebase.js that now has both client and admin
const { firestore, admin, auth } = require('../config/firebase');

// For Firebase client SDK interaction
const { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp 
} = require('firebase/firestore');

// Mapping of business types to their template agent IDs
const BUSINESS_TYPE_TEMPLATES = {
  dropshipper: "szTb6eGNjla2iTx3hcu6",
  themePage: "byOtkIyMEY5GIhD",
  influencer: "z5Doy15F7X2L4aOy1EOv",
  other: "mjXeeYgqbAu0pCrzgbCy" // Default template ID
};

// Check if email exists in Firestore using client SDK
async function checkEmailExists(email) {
  console.log(`Checking if email ${email} already exists in Firestore...`);
  try {
    const usersCollection = collection(firestore, 'Users');
    const q = query(usersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if email exists:', error);
    throw error;
  }
}

// Create Firebase Auth user - uses the wrapped client SDK method that mimics the admin interface
async function createFirebaseUser(email, password, name) {
  console.log(`Creating Firebase Auth user for ${email}...`);
  try {
    // This uses our client SDK wrapper instead of the actual admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });
    
    // Check if this was an existing user that we successfully authenticated with
    if (userRecord.alreadyExists) {
      console.log(`User ${email} already exists and was authenticated successfully`);
      throw new Error('User already exists');
    }
    
    return userRecord;
  } catch (error) {
    console.error(`Error creating user ${email}:`, error);
    
    // Handle specific client SDK errors with more detailed messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('User already exists');
    }
    
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email/password sign-up is not enabled in Firebase. Please enable it in the Firebase Console.');
    }
    
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Firebase SDK authentication failed. Check your API key and project configuration.');
    }
    
    // Re-throw the original error if not handled specifically
    throw error;
  }
}

// Create Tixae Organization
async function createTixaeOrg(name, widgetId) {
  console.log(`Creating Tixae organization for ${name} with widget ID ${widgetId}...`);
  
  // Use API_KEY from environment variables
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY environment variable is not set');
  }
  
  const options = {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: name,
      preferredLanguage: "eng",
      widgetIDs: [
        widgetId || "mjXeeYgqbAu0pCrzgbCy" // Use provided widget ID or default
      ],
      canSelfEdit: true,
      disallowAnyTags: false,
      dashboardLayout: "horizontal"
    })
  };

  try {
    const response = await fetch('https://eu-vg-edge.moeaymandev.workers.dev/v2/orgs', options);
    const data = await response.json();
    
    console.log('Tixae organization creation response:', data);
    
    // Check for various success indicators in the response
    if (data.success === true && data.data?.ID) {
      console.log(`Successfully created organization with ID: ${data.data.ID}`);
      return data;
    } else if (data.ID || (data.data && data.data.ID)) {
      console.log(`Successfully created organization with alternate response format, ID: ${data.ID || data.data.ID}`);
      return data;
    } else {
      console.warn(`Warning: Unexpected response format from Tixae organization API: ${JSON.stringify(data)}`);
      // Try to see if we can still extract an ID
      const anyIdFound = findIdInObject(data);
      if (anyIdFound) {
        console.log(`Found possible organization ID: ${anyIdFound}`);
        return { success: true, data: { ID: anyIdFound } };
      }
      throw new Error(`Failed to create Tixae organization: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error(`Error creating Tixae organization: ${error.message}`);
    throw error; // Re-throw as this is a critical step
  }
}

// Helper function to find any property named ID in an object (recursively)
function findIdInObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  
  if (obj.ID) return obj.ID;
  if (obj.id) return obj.id;
  
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      const found = findIdInObject(obj[key]);
      if (found) return found;
    }
  }
  
  return null;
}

// Create Tixae Client
async function createTixaeClient(orgId, name, email, password) {
  console.log(`Creating Tixae client for org ID ${orgId}...`);
  
  // Use API_KEY from environment variables
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY environment variable is not set');
  }
  
  const options = {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orgId: orgId,
      name: name,
      email: email,
      dashboardPassword: password,
      canAccess: [ 
        "/home",
        "/prompt",
        "/overview",
        "/voice",
        "/billing",
        "/convos",
        "/analytics",
        "/channels",
        "/leads",
        "/kb",
        "/settings",
        "/metrics",
        "/campaigns"],
      isOrgAdmin: true
    })
  };

  try {
    const response = await fetch('https://eu-vg-edge.moeaymandev.workers.dev/v2/clients', options);
    const data = await response.json();
    
    console.log('Tixae client creation response:', data);
    
    // If the response contains any indication of success, return the data
    if (data.success === true) {
      console.log('Successfully created Tixae client');
      return data;
    } else if (data.ID || (data.data && data.data.ID)) {
      console.log('Successfully created Tixae client with alternate response format');
      return data;
    } else {
      console.warn(`Warning: Unexpected response format from Tixae client API: ${JSON.stringify(data)}`);
      return data; // Return the data anyway in case it's useful
    }
  } catch (error) {
    console.error(`Error creating Tixae client: ${error.message}`);
    // Return a basic object so the flow can continue
    return { error: error.message, success: false };
  }
}

// Export an agent template by ID
async function exportAgentTemplate(templateId) {
  console.log(`Exporting agent template with ID ${templateId}...`);
  
  const apiKey = process.env.API_KEY ; // Fallback to sample key if env var not set
  if (!apiKey) {
    throw new Error('API_KEY environment variable is not set');
  }
  
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await fetch(`https://eu-gcp-api.vg-stuff.com/v3/agents/${templateId}/export-template`, options);
  const data = await response.json();
  
  if (!data.agentTemplate) {
    throw new Error(`Failed to export agent template: ${JSON.stringify(data)}`);
  }
  
  console.log(`Successfully exported template for agent: ${templateId}`);
  return data;
}

// Import an agent template from JSON
async function importAgentTemplate(templateData, businessType, templateId) {
  console.log(`Importing agent template for business type: ${businessType}...`);
  
  const apiKey = process.env.API_KEY ; // Fallback to sample key if env var not set
  if (!apiKey) {
    throw new Error('API_KEY environment variable is not set');
  }
  
  // Prepare agent name based on business type
  let agentName;
  switch(businessType) {
    case 'dropshipper':
      agentName = 'Dropshipper';
      break;
    case 'themePage':
      agentName = 'Theme Page';
      break;
    case 'influencer':
      agentName = 'Influencer';
      break;
    default:
      agentName = 'Custom Agent';
  }
  
  // Prepare request body
  const requestBody = {
    agentTemplate: templateData.agentTemplate,
    agentName: agentName,
    fromAgentId: templateId
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  };

  const response = await fetch('https://eu-gcp-api.vg-stuff.com/v3/agents/import-template', options);
  const data = await response.json();
  
  // Handle both response formats: data.agent and data.agentCreated
  if (data.agent && data.agent.ID) {
    console.log(`Successfully imported agent with ID: ${data.agent.ID}`);
    return data.agent;
  } else if (data.agentCreated && data.agentCreated.ID) {
    console.log(`Successfully imported agent with ID: ${data.agentCreated.ID}`);
    return data.agentCreated;
  } else {
    throw new Error(`Failed to import agent template: ${JSON.stringify(data)}`);
  }
}

// Save user data to Firestore using client SDK
async function saveToFirestore(userId, userData) {
  console.log(`Saving user data to Firestore for user ID ${userId}...`);
  try {
    // Add serverTimestamp
    const userDataWithTimestamp = {
      ...userData,
      createdAt: serverTimestamp()
    };
    
    // Set the document using client SDK
    const userDocRef = doc(firestore, 'Users', userId);
    await setDoc(userDocRef, userDataWithTimestamp);
    
    console.log('User data saved to Firestore successfully');
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw error;
  }
}

// Main signup handler
exports.signup = async (req, res) => {
  const { name, email, password, businessType } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    console.log(`Starting signup process for ${email}...`);
    
    // Step 1: Check if email exists in Firestore
    try {
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        console.log(`Email ${email} already exists in Firestore`);
        return res.status(409).json({ message: 'User already exists' });
      }
    } catch (firestoreError) {
      console.error('Error checking Firestore:', firestoreError);
      // Continue with user creation even if Firestore check fails
      // We'll rely on Firebase Auth to catch duplicate emails
    }

    // Step 2: Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await createFirebaseUser(email, password, name);
      console.log(`Firebase user created with ID: ${userRecord.uid}`);
    } catch (authError) {
      console.error('Firebase Auth error:', authError);
      
      if (authError.message === 'User already exists') {
        return res.status(409).json({ message: 'User already exists' });
      }
      
      // Handle other authentication errors
      return res.status(500).json({ 
        message: 'Error creating user account',
        error: authError.message,
        code: authError.code
      });
    }

    // Step 3: Clone the appropriate agent template based on business type
    let widgetId = "mjXeeYgqbAu0pCrzgbCy"; // Default widget ID
    let tixaeOrgData = null;
    let tixaeClientData = null;
    let importedAgentData = null;
    
    try {
      // Get the appropriate template ID based on business type
      const templateId = BUSINESS_TYPE_TEMPLATES[businessType] || BUSINESS_TYPE_TEMPLATES.other;
      console.log(`Selected template ID for business type ${businessType}: ${templateId}`);
      
      // Export the template
      const templateData = await exportAgentTemplate(templateId);
      console.log('Successfully exported template data');
      
      // Import the template to create a new agent
      try {
        importedAgentData = await importAgentTemplate(templateData, businessType, templateId);
        
        // Use the new agent's ID for the organization
        widgetId = importedAgentData.ID;
        console.log(`Using newly created widget ID: ${widgetId}`);
      } catch (importError) {
        console.error('Error importing agent template:', importError);
        // If the error contains the created agent data, try to extract the ID
        if (importError.message && importError.message.includes('agentCreated')) {
          try {
            const errorJson = importError.message.substring(importError.message.indexOf('{'));
            const parsedError = JSON.parse(errorJson);
            if (parsedError.agentCreated && parsedError.agentCreated.ID) {
              widgetId = parsedError.agentCreated.ID;
              importedAgentData = parsedError.agentCreated;
              console.log(`Extracted widget ID from error: ${widgetId}`);
            }
          } catch (parseError) {
            console.error('Failed to parse error JSON:', parseError);
          }
        }
      }
      
      // Step 4: Create Tixae organization with the new agent ID
      try {
        tixaeOrgData = await createTixaeOrg(name, widgetId);
        
        // Step 5: Create Tixae client using org ID
        if (tixaeOrgData && tixaeOrgData.data && tixaeOrgData.data.ID) {
          const orgId = tixaeOrgData.data.ID;
          console.log(`Using organization ID ${orgId} to create client`);
          
          try {
            tixaeClientData = await createTixaeClient(orgId, name, email, password);
          } catch (clientError) {
            console.error('Error creating Tixae client:', clientError);
          }
        }
      } catch (orgError) {
        console.error('Error creating Tixae organization:', orgError);
      }
    } catch (tixaeError) {
      console.error('Error during Tixae API calls:', tixaeError);
      // Continue with user creation even if Tixae API calls fail
    }

    // Step 6: Save all data to Firestore
    const userData = {
      name,
      email,
      businessType: businessType || '',
      plan: 'free', // Always use free plan
      tixaeOrg: tixaeOrgData ? JSON.parse(JSON.stringify(tixaeOrgData)) : null,
      tixaeClient: tixaeClientData ? JSON.parse(JSON.stringify(tixaeClientData)) : null,
      importedAgent: importedAgentData ? JSON.parse(JSON.stringify(importedAgentData)) : null
    };
    
    try {
      await saveToFirestore(userRecord.uid, userData);
    } catch (firestoreError) {
      console.error('Error saving to Firestore:', firestoreError);
      // We've already created the user, so return success even if Firestore save fails
      // This can be handled later by an admin by checking for Firebase Auth users without Firestore data
    }

    // Step 7: Return success response
    res.status(201).json({
      message: 'User created successfully',
      userId: userRecord.uid,
      userData: {
        name,
        email,
        businessType: businessType || '',
        plan: 'free' // Always return free plan
      }
    });

  } catch (error) {
    console.error('Signup Error:', error);
    
    // Handle various errors with appropriate status codes
    if (error.code === 'auth/email-already-in-use') {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    if (error.code && error.code.startsWith('auth/')) {
      return res.status(400).json({ 
        message: 'Authentication error',
        error: error.message,
        code: error.code
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating user',
      error: error.message,
      code: error.code
    });
  }
}; 