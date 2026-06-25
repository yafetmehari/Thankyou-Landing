require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const qrcode = require('qrcode');
const speakeasy = require('speakeasy');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_TO = process.env.EMAIL_TO || EMAIL_USER;

const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Default admin credentials stored in the local database
const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@gmail.com',
  password: 'thankyoubrand'
};

// Helper: Read database
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return {
      tabs: parsed.tabs || [],
      products: parsed.products || [],
      admin: {
        username: (parsed.admin && parsed.admin.username) || DEFAULT_ADMIN.username,
        email: (parsed.admin && parsed.admin.email) || DEFAULT_ADMIN.email,
        password: (parsed.admin && parsed.admin.password) || DEFAULT_ADMIN.password,
        twoFactorEnabled: parsed.admin?.twoFactorEnabled || false,
        twoFactorSecret: parsed.admin?.twoFactorSecret || null,
        twoFactorTempSecret: parsed.admin?.twoFactorTempSecret || null
      },
      settings: parsed.settings || { contactEmail: '' }
    };
  } catch (err) {
    console.error('Error reading database file, using fallback template:', err);
    return { tabs: [], products: [], admin: DEFAULT_ADMIN, settings: { contactEmail: '' } };
  }
}

// Helper: Write database
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing to database file:', err);
    return false;
  }
}

// API: Get products, tabs, and public admin info
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json({
    tabs: data.tabs,
    products: data.products,
    settings: data.settings,
    admin: {
      username: data.admin.username,
      email: data.admin.email,
      twoFactorEnabled: !!data.admin.twoFactorEnabled
    }
  });
});

// API: Contact form submission
app.post('/api/contact', async (req, res) => {
  const { name, email, interest, budget, message, investmentLever } = req.body;
  if (!name || !email || !interest) {
    return res.status(400).json({ success: false, message: 'Required fields missing.' });
  }

  const contactSummary = `New inquiry from: ${name} <${email}>\nInterest: ${interest} | Budget: ${budget || 'Not specified'} | Investment Lever: ${investmentLever || '—'}\nMessage: ${message || '—'}`;
  console.log(`\n[CONTACT FORM] ${contactSummary}`);

  const settings = readData().settings || { contactEmail: '' };
  const recipient = EMAIL_TO || settings.contactEmail || data.admin.email || '';

  if (EMAIL_USER && EMAIL_PASS && recipient) {
    const mailOptions = {
      from: EMAIL_USER,
      to: EMAIL_TO,
      replyTo: email,
      subject: `New inquiry from ${name} — ${interest}`,
      text: contactSummary,
      html: `<h2>New inquiry from ${name}</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Interest:</strong> ${interest}</p>
          <p><strong>Budget:</strong> ${budget || 'Not specified'}</p>
          <p><strong>Investment Lever:</strong> ${investmentLever || '—'}</p>
          <p><strong>Message:</strong><br>${message || '—'}</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.json({ success: true, message: "Thank you! Your message has been sent." });
    } catch (err) {
      console.error('Email send error:', err);
      return res.status(500).json({ success: false, message: 'Unable to send email. Contact saved to server logs.' });
    }
  }

  return res.json({ success: true, message: "Thank you! We'll be in touch shortly. (Email not configured.)" });
});

// API: Login verification
app.post('/api/login', (req, res) => {
  const { username, password, code } = req.body;
  const data = readData();
  const admin = data.admin || DEFAULT_ADMIN;
  const normalizedLogin = (username || '').trim().toLowerCase();
  const matchesUsername = normalizedLogin === (admin.username || '').toLowerCase();
  const matchesEmail = normalizedLogin === (admin.email || '').toLowerCase();

  if (!matchesUsername && !matchesEmail) {
    return res.status(401).json({ success: false, message: 'Invalid credentials. Please try again.' });
  }

  if (password !== admin.password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials. Please try again.' });
  }

  if (admin.twoFactorEnabled) {
    if (!code) {
      return res.status(200).json({ twoFactorRequired: true, success: false, message: 'Two-factor authentication code required.' });
    }

    const valid = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid authenticator code. Please try again.' });
    }
  }

  res.json({
    success: true,
    token: 'tyb-session-token-2026',
    message: 'Successfully authenticated'
  });
});

// API: Admin account management
app.post('/api/admin', (req, res) => {
  const { admin } = req.body;
  if (!admin || typeof admin.username !== 'string' || typeof admin.email !== 'string') {
    return res.status(400).json({ success: false, message: 'Admin username and email must be provided.' });
  }

  const data = readData();
  const current = data.admin || DEFAULT_ADMIN;
  const updatedAdmin = {
    username: admin.username.trim(),
    email: admin.email.trim().toLowerCase(),
    password: current.password,
    twoFactorEnabled: current.twoFactorEnabled || false,
    twoFactorSecret: current.twoFactorSecret || null,
    twoFactorTempSecret: current.twoFactorTempSecret || null
  };

  if (typeof admin.password === 'string' && admin.password.trim() !== '') {
    updatedAdmin.password = admin.password.trim();
  }

  data.admin = updatedAdmin;

  if (writeData(data)) {
    res.json({ success: true, message: 'Admin account updated successfully.', admin: { username: data.admin.username, email: data.admin.email, twoFactorEnabled: data.admin.twoFactorEnabled } });
  } else {
    res.status(500).json({ success: false, message: 'Failed to write admin account to database.' });
  }
});

// API: Admin 2FA setup
app.post('/api/admin/2fa/setup', async (req, res) => {
  const data = readData();
  const admin = data.admin || DEFAULT_ADMIN;
  const secret = speakeasy.generateSecret({ length: 20, name: `thank you brand (${admin.email})`, issuer: 'thank you brand' });
  admin.twoFactorTempSecret = secret.base32;
  admin.twoFactorEnabled = false;

  if (!writeData(data)) {
    return res.status(500).json({ success: false, message: 'Failed to save 2FA setup secret.' });
  }

  try {
    const qrDataUri = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ success: true, secret: secret.base32, qrDataUri });
  } catch (err) {
    console.error('QR code generation failed:', err);
    res.status(500).json({ success: false, message: 'Failed to generate QR code for authenticator app.' });
  }
});

app.post('/api/admin/2fa/enable', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Verification code is required.' });
  }

  const data = readData();
  const admin = data.admin || DEFAULT_ADMIN;

  if (!admin.twoFactorTempSecret) {
    return res.status(400).json({ success: false, message: '2FA setup has not been started.' });
  }

  const valid = speakeasy.totp.verify({
    secret: admin.twoFactorTempSecret,
    encoding: 'base32',
    token: code,
    window: 1
  });

  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid authenticator code. Please try again.' });
  }

  admin.twoFactorSecret = admin.twoFactorTempSecret;
  admin.twoFactorTempSecret = null;
  admin.twoFactorEnabled = true;

  if (writeData(data)) {
    res.json({ success: true, message: 'Two-factor authentication enabled successfully.' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to enable two-factor authentication.' });
  }
});

app.post('/api/admin/2fa/disable', (req, res) => {
  const { code } = req.body;
  const data = readData();
  const admin = data.admin || DEFAULT_ADMIN;

  if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
    return res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled.' });
  }

  if (!code) {
    return res.status(400).json({ success: false, message: 'Verification code is required to disable 2FA.' });
  }

  const valid = speakeasy.totp.verify({
    secret: admin.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 1
  });

  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid authenticator code. Please try again.' });
  }

  admin.twoFactorEnabled = false;
  admin.twoFactorSecret = null;
  admin.twoFactorTempSecret = null;

  if (writeData(data)) {
    res.json({ success: true, message: 'Two-factor authentication disabled successfully.' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to disable two-factor authentication.' });
  }
});

// API: Admin password reset
app.post('/api/admin/reset', async (req, res) => {
  const data = readData();
  const admin = data.admin || DEFAULT_ADMIN;

  if (!admin.email) {
    return res.status(400).json({ success: false, message: 'Admin email is not configured.' });
  }

  if (!EMAIL_USER || !EMAIL_PASS) {
    return res.status(500).json({ success: false, message: 'Email transport is not configured. Set EMAIL_USER and EMAIL_PASS in your environment.' });
  }

  const mailOptions = {
    from: EMAIL_USER,
    to: admin.email,
    subject: 'Admin Password Reset Information',
    text: `Hello,

Your admin sign-in details are:
Username: ${admin.username}
Email: ${admin.email}
Password: ${admin.password}

Please use these credentials to sign in and update your admin password if needed.
`,
    html: `<h2>Admin Password Reset Information</h2>
      <p><strong>Username:</strong> ${admin.username}</p>
      <p><strong>Email:</strong> ${admin.email}</p>
      <p><strong>Password:</strong> ${admin.password}</p>
      <p>Use these credentials to sign in and update your admin settings if needed.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Password reset information sent to your admin Gmail address.' });
  } catch (err) {
    console.error('Admin reset email error:', err);
    res.status(500).json({ success: false, message: 'Unable to send reset email. Check your SMTP settings.' });
  }
});

// API: Manage tabs/categories
app.post('/api/tabs', (req, res) => {
  const { tabs } = req.body;
  if (!Array.isArray(tabs)) {
    return res.status(400).json({ success: false, message: 'Tabs must be a valid array' });
  }

  const data = readData();
  data.tabs = tabs;
  
  if (writeData(data)) {
    res.json({ success: true, message: 'Categories updated successfully', data });
  } else {
    res.status(500).json({ success: false, message: 'Failed to write category updates to database' });
  }
});

// API: Save admin settings
app.post('/api/settings', (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings.contactEmail !== 'string') {
    return res.status(400).json({ success: false, message: 'Settings must be a valid object with contactEmail.' });
  }

  const data = readData();
  data.settings = { contactEmail: settings.contactEmail.trim() };

  if (writeData(data)) {
    res.json({ success: true, message: 'Settings saved successfully', data });
  } else {
    res.status(500).json({ success: false, message: 'Failed to save settings to database' });
  }
});

// API: Create or edit product
app.post('/api/products', (req, res) => {
  const product = req.body;
  if (!product.title || !product.category || isNaN(product.price)) {
    return res.status(400).json({ success: false, message: 'Invalid product information' });
  }

  const data = readData();
  const productId = parseInt(product.id);

  if (productId) {
    // Edit existing product
    const index = data.products.findIndex(p => p.id === productId);
    if (index > -1) {
      data.products[index] = {
        id: productId,
        title: product.title,
        category: product.category,
        price: parseFloat(product.price),
        image: product.image || 'assets/hero_lifestyle.png',
        tag: product.tag || '',
        desc: product.desc || ''
      };
    } else {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
  } else {
    // Create new product
    const nextId = data.products.length > 0 
      ? Math.max(...data.products.map(p => p.id)) + 1 
      : 1;
      
    data.products.push({
      id: nextId,
      title: product.title,
      category: product.category,
      price: parseFloat(product.price),
      image: product.image || 'assets/hero_lifestyle.png',
      tag: product.tag || '',
      desc: product.desc || ''
    });
  }

  if (writeData(data)) {
    res.json({ success: true, message: 'Product database updated successfully', data });
  } else {
    res.status(500).json({ success: false, message: 'Failed to write product changes to database' });
  }
});

// API: Delete product
app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readData();
  
  const initialLength = data.products.length;
  data.products = data.products.filter(p => p.id !== id);

  if (data.products.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  if (writeData(data)) {
    res.json({ success: true, message: 'Product deleted successfully', data });
  } else {
    res.status(500).json({ success: false, message: 'Failed to save deletion status' });
  }
});

// Serve admin dashboard at default route for clean reference
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fallback to index.html for undefined requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  thank you brand server is active!`);
  console.log(`  Access the site locally at: http://localhost:${PORT}`);
  console.log(`  Access the Admin panel at: http://localhost:${PORT}/admin`);
  console.log(`===================================================`);
});
