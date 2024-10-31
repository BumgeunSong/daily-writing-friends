// src/components/Pages/BoardListPage.tsx
import React, { useEffect, useState } from 'react';
import { firestore } from '../../firebase';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Board } from '../../types/Board';
import { User } from '../../types/User';
import { Link } from 'react-router-dom';

const BoardListPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBoards = async () => {
            if (!currentUser) return;

            try {
                // Fetch user permissions
                const userDocRef = doc(firestore, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                const user = userDoc.data() as User;
                const userBoardPermissions = user?.boardPermissions || {};

                // Fetch boards based on user permissions
                const boardIds = Object.keys(userBoardPermissions);
                if (boardIds.length > 0) {
                    const q = query(collection(firestore, 'boards'), where('__name__', 'in', boardIds));
                    const querySnapshot = await getDocs(q);
                    const boardsData: Board[] = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Board[];

                    setBoards(boardsData);
                } else {
                    setBoards([]);
                }
            } catch (error) {
                console.error('Error fetching boards:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBoards();
    }, [currentUser]);

    const handleBoardClick = (boardId: string) => {
        localStorage.removeItem('boardId');
        localStorage.setItem('boardId', boardId);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-4">어디로 들어갈까요?</h1>
            {boards.length === 0 ? (
                <div className="text-center text-gray-600">
                    <p>아직 초대받은 게시판이 없어요. 관리자에게 문의해주세요. 😔</p>
                </div>
            ) : (
                <ul className="space-y-4">
                    {boards.map(board => (
                        <Link
                            to={`/board/${board.id}`}
                            onClick={() => handleBoardClick(board.id)}
                            key={board.id}
                        >
                            <li className="p-4 bg-white rounded shadow hover:bg-gray-100 transition">
                                <h2 className="text-xl font-semibold">{board.title}</h2>
                                <p className="text-gray-600">{board.description}</p>
                            </li>
                        </Link>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default BoardListPage;