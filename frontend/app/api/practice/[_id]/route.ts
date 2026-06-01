import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import PracticeSession from "@/app/models/PracticeSession";
import { verifyAccessToken } from "@/app/lib/Auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ _id: string }> }
) {
  try {
    const { _id } = await params;
    if (!_id || !/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy token" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    await connectDB();

    const session = await PracticeSession.findOne({
      _id,
      userId: payload.userId,
    }).lean();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy buổi luyện tập" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session._id.toString(),
        title: session.title,
        jobDescription: session.jobDescription,
        topic: session.topic,
        industry: session.industry,
        tags: session.tags || [],
        attemptCount: session.attemptCount || 0,
        highestScore: session.highestScore || 0,
        latestResult: session.latestResult,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("GET /api/practice/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ _id: string }> }
) {
  try {
    const { _id } = await params;
    if (!_id || !/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy token" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, isCompletedRun, score, duration, feedback, ratings, questions, jobDescription, topic, industry } = body;

    await connectDB();

    const session = await PracticeSession.findOne({
      _id,
      userId: payload.userId,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy buổi luyện tập" },
        { status: 404 }
      );
    }

    if (isCompletedRun) {
      // Practice session completed run simulation
      const currentScore = score || 0;
      session.attemptCount = (session.attemptCount || 0) + 1;
      if (currentScore > (session.highestScore || 0)) {
        session.highestScore = currentScore;
      }
      session.latestResult = {
        score: currentScore,
        duration: duration || "10 phút",
        feedback: feedback || "Tốt ở phần kỹ thuật, cần cải thiện giao tiếp và giải thích rõ hơn.",
        ratings: ratings || {
          communication: 80,
          knowledge: 80,
          problemSolving: 80,
          confidence: 80,
        },
        questions: questions || [],
        createdAt: new Date(),
      };
    } else {
      // Just rename/update metadata
      if (title !== undefined) {
        if (!title.trim()) {
          return NextResponse.json(
            { success: false, message: "Tiêu đề không được để trống" },
            { status: 400 }
          );
        }
        session.title = title.trim();
      }
      if (jobDescription !== undefined) {
        session.jobDescription = jobDescription;
      }
      if (topic !== undefined) {
        session.topic = topic;
      }
      if (industry !== undefined) {
        session.industry = industry;
      }
    }

    await session.save();

    return NextResponse.json({
      success: true,
      message: "Cập nhật thành công",
      session: {
        id: session._id.toString(),
        title: session.title,
        jobDescription: session.jobDescription,
        topic: session.topic,
        industry: session.industry,
        tags: session.tags || [],
        attemptCount: session.attemptCount || 0,
        highestScore: session.highestScore || 0,
        latestResult: session.latestResult,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("PUT /api/practice/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ _id: string }> }
) {
  try {
    const { _id } = await params;
    if (!_id || !/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy token" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    await connectDB();

    const result = await PracticeSession.deleteOne({
      _id,
      userId: payload.userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy hoặc không có quyền xóa buổi luyện tập này" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Xóa buổi luyện tập thành công",
    });
  } catch (error: any) {
    console.error("DELETE /api/practice/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
