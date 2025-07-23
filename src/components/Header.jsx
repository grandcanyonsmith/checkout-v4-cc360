import { CheckCircleIcon } from '@heroicons/react/24/solid'

export default function Header() {
  return (
    <header className="relative z-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between px-4 py-6 sm:px-8 lg:px-8">
        <div className="flex items-center space-x-3 group">
          <img
            src="https://cc360-pages.s3.us-west-2.amazonaws.com/course-creator-360-logo.webp"
            className="h-8 w-auto transition-transform group-hover:scale-105"
            alt="Course Creator 360"
          />
        </div>
      </div>
    </header>
  )
} 