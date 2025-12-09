import multer from 'multer';
import path from 'path';

// Configuração de armazenamento do Multer
const storage = multer.diskStorage({
  // Destino do arquivo
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  // Nome do arquivo
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Filtro de arquivo (opcional, mas recomendado)
// Exemplo: aceitar apenas imagens
// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith('image')) {
//     cb(null, true);
//   } else {
//     cb(new Error('Apenas imagens são permitidas!'), false);
//   }
// };

const upload = multer({
  storage: storage,
  // fileFilter: fileFilter, // Descomente para adicionar filtro de arquivo
  // limits: { fileSize: 1024 * 1024 * 5 } // Exemplo: limite de 5MB
});

export default upload;
