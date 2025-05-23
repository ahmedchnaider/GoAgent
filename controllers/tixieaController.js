const axios = require('axios');
const { firestore } = require('../config/firebase');
const { collection, addDoc, serverTimestamp } = require('firebase/firestore');

const makeCall = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        // Make the API call to Tixiea
        const response = await axios.post('https://eu-gcp-api.vg-stuff.com/v3/calls', {
            to: phoneNumber,
            agentId: "tTKtg6VdMS9UKvKg2WtU"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.API_KEY}`
            }
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error making call:', error);
        res.status(500).json({ 
            error: 'Failed to initiate call',
            details: error.response?.data || error.message 
        });
    }
};

const saveLead = async (req, res) => {
    try {
        const leadData = req.body;
        
        // Validate required fields based on source
        if (leadData.source === 'newsletter' && !leadData.email) {
            return res.status(400).json({ error: 'Email is required for newsletter subscriptions' });
        }
        
        if (leadData.source === 'voice-assistant' && (!leadData.fullName || !leadData.email || !leadData.phoneNumber)) {
            return res.status(400).json({ error: 'Name, email, and phone number are required for voice assistant leads' });
        }
        
        // Add timestamp if not provided
        if (!leadData.timestamp) {
            leadData.timestamp = new Date().toISOString();
        }
        
        // Add server timestamp for sorting/querying
        leadData.createdAt = serverTimestamp();
        
        // Save to Firestore
        const leadsCollection = collection(firestore, 'leads');
        const docRef = await addDoc(leadsCollection, leadData);
        
        console.log(`Lead saved with ID: ${docRef.id}`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Lead data saved successfully',
            id: docRef.id 
        });
    } catch (error) {
        console.error('Error saving lead:', error);
        res.status(500).json({ 
            error: 'Failed to save lead data',
            details: error.message 
        });
    }
};

module.exports = {
    makeCall,
    saveLead
}; 