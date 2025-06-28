// server.js
const express = require('express');
const twilio = require('twilio');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'LunaLock Emergency SMS Server Running',
        timestamp: new Date().toISOString()
    });
});

// Emergency SMS endpoint
app.post('/send-emergency-sms', async (req, res) => {
    try {
        const { to, message, contactName, hasLocation } = req.body;
        
        // Validate required fields
        if (!to || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: to, message' 
            });
        }
        
        // Clean phone number (ensure it has country code)
        let cleanPhoneNumber = to.replace(/\D/g, ''); // Remove non-digits
        if (cleanPhoneNumber.length === 10) {
            cleanPhoneNumber = '+1' + cleanPhoneNumber; // Add US country code
        } else if (!cleanPhoneNumber.startsWith('+')) {
            cleanPhoneNumber = '+' + cleanPhoneNumber;
        }
        
        console.log(`📱 Emergency SMS Request:`);
        console.log(`   To: ${cleanPhoneNumber} (${contactName || 'Unknown'})`);
        console.log(`   Has Location: ${hasLocation || false}`);
        console.log(`   Message Length: ${message.length} chars`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        
        // Send SMS via Twilio
        const result = await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: cleanPhoneNumber
        });
        
        console.log(`✅ SMS sent successfully!`);
        console.log(`   Message SID: ${result.sid}`);
        console.log(`   Status: ${result.status}`);
        
        // Send success response
        res.json({ 
            success: true, 
            messageSid: result.sid,
            status: result.status,
            to: cleanPhoneNumber,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error sending emergency SMS:', error);
        
        // Handle specific Twilio errors
        if (error.code) {
            console.error(`   Twilio Error Code: ${error.code}`);
            console.error(`   Twilio Error Message: ${error.message}`);
        }
        
        res.status(500).json({ 
            success: false, 
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

// Test endpoint for development
app.post('/test-sms', async (req, res) => {
    try {
        const { to } = req.body;
        
        if (!to) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number required' 
            });
        }
        
        const testMessage = "🧪 This is a test message from your LunaLock emergency system. If you received this, the SMS integration is working correctly!";
        
        const result = await client.messages.create({
            body: testMessage,
            from: twilioPhoneNumber,
            to: to
        });
        
        console.log(`📋 Test SMS sent to ${to}: ${result.sid}`);
        
        res.json({ 
            success: true, 
            messageSid: result.sid,
            message: "Test SMS sent successfully"
        });
        
    } catch (error) {
        console.error('❌ Test SMS failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 LunaLock Emergency SMS Server running on port ${PORT}`);
    console.log(`📱 Twilio Phone Number: ${twilioPhoneNumber || 'NOT SET'}`);
    console.log(`🔑 Account SID: ${accountSid ? accountSid.substr(0, 10) + '...' : 'NOT SET'}`);
    console.log(`⚠️  Make sure environment variables are set!`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});