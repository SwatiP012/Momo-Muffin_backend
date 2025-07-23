const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing missing dependencies...');

// List of packages to install
const packages = [
  'express-validator',
  'multer-storage-cloudinary',
  'cloudinary',
  'multer',
  'cors',
  'express',
  'mongoose',
  'dotenv',
  'cookie-parser',
  'jsonwebtoken',
  'bcryptjs',
  'twilio'
];

try {
  // Check if package.json exists
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('package.json not found, creating one...');
    const packageJson = {
      name: "mern-ecommerce-server",
      version: "1.0.0",
      description: "MERN E-commerce Server",
      main: "server.js",
      scripts: {
        "start": "node server.js",
        "dev": "nodemon server.js"
      },
      dependencies: {},
      devDependencies: {
        "nodemon": "^2.0.22"
      }
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('package.json created');
  }

  // Install the packages
  console.log(`Installing packages: ${packages.join(', ')}`);
  execSync(`npm install ${packages.join(' ')}`, { stdio: 'inherit' });
  
  console.log('All dependencies installed successfully');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}
