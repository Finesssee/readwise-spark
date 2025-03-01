import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Mock data for books and PDFs based on the screenshot
const books = [
  {
    id: '1',
    title: 'Chip War',
    author: 'Chris Miller',
    coverUrl: 'https://m.media-amazon.com/images/I/71LXKIaha8L._AC_UF1000,1000_QL80_.jpg',
    readingTime: '8hr 0min'
  },
  {
    id: '2',
    title: 'How to Win at Chess',
    author: 'Levy Rozman',
    coverUrl: 'https://m.media-amazon.com/images/I/71jKyhQfj+L._AC_UF1000,1000_QL80_.jpg',
    readingTime: '3hr 46min'
  },
  {
    id: '3',
    title: 'Leonardo da Vinci',
    author: 'Walter Isaacson',
    coverUrl: 'https://m.media-amazon.com/images/I/51wlUnNtsHL._AC_UF1000,1000_QL80_.jpg',
    readingTime: '11hr 26min'
  },
  {
    id: '4',
    title: 'Kissinger',
    author: 'Walter Isaacson',
    coverUrl: 'https://m.media-amazon.com/images/I/41YMYR7XZSL._AC_UF1000,1000_QL80_.jpg',
    readingTime: '22hr 40min'
  },
  {
    id: '5',
    title: 'The Innovators',
    author: 'Walter Isaacson',
    coverUrl: 'https://m.media-amazon.com/images/I/71OQIRHPMJL._AC_UF1000,1000_QL80_.jpg',
    readingTime: '12hr 13min'
  },
  {
    id: '6',
    title: 'Benjamin Franklin',
    author: 'Walter Isaacson',
    coverUrl: 'https://m.media-amazon.com/images/I/51vbKOgJlKL._AC_UF1000,1000_QL80_.jpg',
    readingTime: '10hr 5min'
  }
];

const pdfs = [
  {
    id: '1',
    title: 'Homo Deus: A Brief History of Tomorrow',
    author: 'Yuval Noah Harari',
    coverUrl: 'https://m.media-amazon.com/images/I/71N7tGkwGnL._AC_UF1000,1000_QL80_.jpg',
    readingTime: '9hr 50min'
  },
  {
    id: '2',
    title: 'A History of Central Banking and the Enslavement of Mankind',
    author: 'Unknown',
    coverUrl: 'https://m.media-amazon.com/images/I/71Yw9aYXptL._AC_UF1000,1000_QL80_.jpg',
    readingTime: '3hr 20min'
  },
  {
    id: '3',
    title: 'The Bonus Chapters',
    author: 'Unknown',
    coverUrl: 'https://m.media-amazon.com/images/I/61Ars9rdgGS._AC_UF1000,1000_QL80_.jpg',
    readingTime: '27min'
  }
];

// Book card component
const BookCard = ({ book }: { book: typeof books[0] }) => {
  return (
    <div className="flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-md">
        <img 
          src={book.coverUrl} 
          alt={book.title} 
          className="object-cover w-full h-full"
        />
      </div>
      <div className="mt-2">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span className="font-medium">BOOK</span>
        </div>
        <h3 className="text-sm font-medium mt-1 line-clamp-1">{book.title}</h3>
        <div className="flex items-center mt-1">
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground">{book.author}</span>
          </div>
        </div>
        <div className="flex items-center mt-1">
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground">{book.readingTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// PDF card component
const PDFCard = ({ pdf }: { pdf: typeof pdfs[0] }) => {
  return (
    <div className="flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-md">
        <img 
          src={pdf.coverUrl} 
          alt={pdf.title} 
          className="object-cover w-full h-full"
        />
      </div>
      <div className="mt-2">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span className="font-medium">READWISE.IO</span>
        </div>
        <h3 className="text-sm font-medium mt-1 line-clamp-2">{pdf.title}</h3>
        <div className="flex items-center mt-1">
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground">{pdf.author}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pagination dots component
const PaginationDots = ({ count, active }: { count: number, active: number }) => {
  return (
    <div className="flex items-center justify-center space-x-1">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            i === active ? "bg-primary" : "bg-gray-300"
          )}
        />
      ))}
    </div>
  );
};

const Home = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome Finessse</h1>
      </div>
      
      {/* Books Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Books</h2>
          <div className="flex items-center space-x-2">
            <button className="p-1 rounded-full border">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="p-1 rounded-full border">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="relative">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          
          <div className="mt-4 flex justify-center">
            <PaginationDots count={6} active={0} />
          </div>
        </div>
      </div>
      
      {/* PDFs Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">PDFs</h2>
          <div className="flex items-center space-x-2">
            <button className="p-1 rounded-full border">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="p-1 rounded-full border">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="relative">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pdfs.map((pdf) => (
              <PDFCard key={pdf.id} pdf={pdf} />
            ))}
          </div>
          
          <div className="mt-4 flex justify-center">
            <PaginationDots count={6} active={0} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 