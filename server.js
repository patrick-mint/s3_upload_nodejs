const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
    const fileContent = fs.readFileSync(req.file.path);
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: req.file.originalname,
        Body: fileContent,
        ACL: 'private'
    };

    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        fs.unlinkSync(req.file.path);

        const urlParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: req.file.originalname,
            Expires: 60 * 5 // URL expiry time in seconds
        };

        const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand(urlParams), { expiresIn: 300 });
        res.status(200).json({ message: 'File uploaded successfully', url: signedUrl });
    } catch (err) {
        res.status(500).json({ error: "Error -> " + err });
    }
});

app.listen(port, () => {
    console.log(`Server is up and running on port ${port}`);
});
