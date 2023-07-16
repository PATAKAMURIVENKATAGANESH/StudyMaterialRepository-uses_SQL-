const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const fs = require('fs');
const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname.split('.').pop();
    cb(null, uniqueSuffix + '.' + fileExtension);
  }
});

const upload = multer({ storage: storage });

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle the file upload
app.post('/upload', upload.single('pdf_file'), (req, res) => {
  // Read the uploaded file
  const pdfData = fs.readFileSync(req.file.path);
  const title = req.body.title;
  const subject = req.body.subject;
  const fileType = req.file.mimetype;

  // Connect to the MySQL database
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Ganesh@7081',
    database: 'studymaterial'
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL database:', err);
      res.status(500).send('Internal Server Error');
    } else {
      // Create the table if it doesn't exist
      const createTableQuery = 'CREATE TABLE IF NOT EXISTS material (id INT AUTO_INCREMENT PRIMARY KEY, file_data LONGBLOB, title VARCHAR(255), subject VARCHAR(255), file_type VARCHAR(50))';
      connection.query(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          res.status(500).send('Internal Server Error');
        } else {
          // Insert the file into the database
          const insertQuery = 'INSERT INTO material (file_data, title, subject, file_type) VALUES (?, ?, ?, ?)';
          connection.query(insertQuery, [pdfData, title, subject, fileType], (err) => {
            if (err) {
              console.error('Error inserting file:', err);
              res.status(500).send('Internal Server Error');
            } else {
              console.log('File inserted successfully');
              // Get all files under the same subject
              const filesBySubjectQuery = 'SELECT * FROM material WHERE subject = ?';
              connection.query(filesBySubjectQuery, [subject], (err, files) => {
                if (err) {
                  console.error('Error retrieving files by subject:', err);
                  res.status(500).send('Internal Server Error');
                } else {
                  // Send the response HTML with the uploaded files under the subject
                  let responseHtml = `
                    <h3>File uploaded and stored in the database</h3>
                    <h4>Files under the subject '${subject}'</h4>
                  `;

                  if (files.length > 0) {
                    const fileList = files.map(file => `
                      <li>
                        ${file.title} - 
                        <a href="/display/${file.id}">View</a> |
                        <a href="/download/${file.id}">Download</a>
                      </li>
                    `).join('');
                    responseHtml += `<ul>${fileList}</ul>`;
                  } else {
                    responseHtml += `<p>No files found under the subject '${subject}'</p>`;
                  }

                  res.send(responseHtml);
                }
              });
            }
          });
        }
      });
    }
  });
});

// Handle the search form submission and file retrieval
app.get('/search', (req, res) => {
  const keyword = req.query.keyword;

  // Connect to the MySQL database
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Ganesh@7081',
    database: 'studymaterial'
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL database:', err);
      res.status(500).send('Internal Server Error');
    } else {
      // Perform the search query
      const searchQuery = 'SELECT * FROM material WHERE title LIKE ? OR subject LIKE ?';
      const keywordPattern = `%${keyword}%`;
      connection.query(searchQuery, [keywordPattern, keywordPattern], (err, results) => {
        if (err) {
          console.error('Error searching for files:', err);
          res.status(500).send('Internal Server Error');
        } else {
          if (results.length > 0) {
            // Files found in the database
            let responseHtml = `
              <h3>Files Found</h3>
              <ul>
            `;
            results.forEach((file) => {
              responseHtml += `
                <li>
                  ${file.title} - 
                  <a href="/display/${file.id}">View</a> |
                  <a href="/download/${file.id}">Download</a>
                </li>
              `;
            });
            responseHtml += '</ul>';
            res.send(responseHtml);
          } else {
            // No files found in the database
            res.send('<p>No files found</p>');
          }
        }
      });
    }
  });
});

// Create a new connection for file downloading
app.get('/download/:id', (req, res) => {
  const fileId = req.params.id;

  // Connect to the MySQL database
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Ganesh@7081',
    database: 'studymaterial'
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL database:', err);
      res.status(500).send('Internal Server Error');
    } else {
      // Perform the query to retrieve the file by ID and send it as a response
      const downloadQuery = 'SELECT * FROM material WHERE id = ?';
      connection.query(downloadQuery, [fileId], (err, results) => {
        if (err) {
          console.error('Error retrieving file by ID:', err);
          res.status(500).send('Internal Server Error');
        } else {
          if (results.length > 0) {
            // File found in the database
            const fileData = results[0].file_data;
            const fileName = results[0].title;
            const fileType = results[0].file_type;

            // Set the response headers for file download
            res.setHeader('Content-Type', fileType);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            // Send the file data as the response
            res.send(fileData);
          } else {
            // File not found in the database
            res.status(404).send('File not found');
          }
        }
      });
    }
  });
});

// Create a new connection for file display
app.get('/display/:id', (req, res) => {
  const fileId = req.params.id;

  // Connect to the MySQL database
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Ganesh@7081',
    database: 'studymaterial'
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL database:', err);
      res.status(500).send('Internal Server Error');
    } else {
      // Perform the query to retrieve the file by ID and send it as a response
      const displayQuery = 'SELECT * FROM material WHERE id = ?';
      connection.query(displayQuery, [fileId], (err, results) => {
        if (err) {
          console.error('Error retrieving file by ID:', err);
          res.status(500).send('Internal Server Error');
        } else {
          if (results.length > 0) {
            // File found in the database
            const fileData = results[0].file_data;
            const fileName = results[0].title;
            const fileType = results[0].file_type;

            // Set the response headers for file display
            res.setHeader('Content-Type', fileType);
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            // Send the file data as the response
            res.send(fileData);
          } else {
            // File not found in the database
            res.status(404).send('File not found');
          }
        }
      });
    }
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
