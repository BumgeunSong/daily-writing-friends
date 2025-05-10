import { motion } from "framer-motion"

export function PostCreationLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center text-center"
    >
      <motion.h2
        className="mb-6 text-2xl font-medium"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        글을 업로드하는 중입니다
      </motion.h2>

      <motion.div
        className="mt-2 flex space-x-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="size-3 rounded-full bg-black"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.2,
              repeatType: "loop",
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
