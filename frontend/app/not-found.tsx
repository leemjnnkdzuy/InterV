import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 sm:px-6 lg:px-8">
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-50 blur-[100px] dark:opacity-20">
                <div className="h-[24rem] w-[24rem] rounded-full bg-primary/30" />
            </div>

            <div className="mx-auto max-w-lg text-center">
                <h1 className="mb-4 bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-8xl font-extrabold tracking-tighter text-transparent sm:text-9xl">
                    404
                </h1>

                <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    Trang không tồn tại
                </h2>

                <p className="mb-10 text-lg text-muted-foreground">
                    Xin lỗi, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm. Có thể trang đã bị xóa, đổi tên hoặc tạm thời không truy cập được.
                </p>

                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                    <Button asChild size="lg" className="rounded-full font-medium shadow-lg transition-transform hover:scale-105 active:scale-95">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Về trang chủ
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full font-medium transition-transform hover:scale-105 active:scale-95">
                        <Link href="/">
                            Liên hệ hỗ trợ
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
