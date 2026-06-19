import { Course } from './types';

export const courses: Course[] = [
  {
    id: 'build-train-llm-jax',
    title: 'Build and Train an LLM with JAX',
    type: 'Short Course',
    difficulty: 'Advanced',
    topic: 'JAX LLM',
    description: 'Build and train a 20M-parameter LLM from scratch using JAX and Flax, leveraging the exact high-performance computing principles behind Gemini.',
    fullDescription: 'In Build and Train an LLM with JAX, created in partnership with Google, you will learn the core high-performance numerical computing foundations of JAX. You will build and compile a 20-million parameter Decoder-only transformer model from scratch using Flax Linen, implement a stateful optimization training loop with Optax, and scale your training across multi-node GPU/TPU accelerators using JAX\'s distributed parallel model systems.',
    instructorName: 'Chris Achard',
    instructorTitle: 'Core Systems & Machine Learning Educator',
    duration: '1.5 hours',
    lessonCount: '6 lessons',
    rating: 4.9,
    enrolledCount: '95,000+ students',
    partnerName: 'Google',
    skillsAcquired: [
      'JAX Functional Programming',
      'Just-In-Time (JIT) Compilation',
      'Flax Linen Architectures',
      'Optax Stateful Optimizers',
      'Hardware TPU/GPU Sharding'
    ],
    requirements: [
      'Strong familiarity with deep learning foundations (Neural Networks, Transformers)',
      'Proficient programming capabilities in Python and NumPy matrix operations'
    ],
    thumbnailBg: 'bg-indigo-950 text-indigo-400',
    thumbnailIconCode: 'jax',
    isPaid: true,
    price: 39,
    syllabus: [
      {
        chapter: 'Lesson 1',
        title: 'High-Performance Computing with JAX',
        description: 'Discover the design principles of JAX. Learn about functional purity, Accelerated Linear Algebra (XLA), and standard transformations like jit, grad, and vmap.'
      },
      {
        chapter: 'Lesson 2',
        title: 'XLA Compilation & Pure Transformations',
        description: 'Master Just-In-Time (JIT) compilation optimization boundaries, static vs. dynamic tracer tracking, and vectorize custom operations with high execution speed.'
      },
      {
        chapter: 'Lesson 3',
        title: 'Defining the 20M Transformer with Flax Linen',
        description: 'Construct custom modular neural blocks using Flax Linen. Build multi-head self-attention layers, rotary embeddings, feed-forward sub-networks, and the full Decoder layout.'
      },
      {
        chapter: 'Lesson 4',
        title: 'High-Throughput Tokenization & Data Pipelines',
        description: 'Build streaming byte-pair tokenizers, structure highly concurrent CPU processing queues, and feed memory-aligned shards to the high-performance accelerator.'
      },
      {
        chapter: 'Lesson 5',
        title: 'Stateful Optimization and Training Loop',
        description: 'Maintain state securely across JAX\'s stateless environment using Flax\'s TrainState container. Optimize weights with Optax schedules and execute value_and_grad passes.'
      },
      {
        chapter: 'Lesson 6',
        title: 'Distributed Scaling & Shard Parallelism',
        description: 'Navigate multi-device training grids (GPUs and TPUs). Map model parameters across clusters using pmap, and formulate multi-dimensional array sharding meshes.'
      }
    ]
  },
  {
    id: 'chatgpt-prompt-engineering',
    title: 'ChatGPT Prompt Engineering for Developers',
    type: 'Short Course',
    difficulty: 'Beginner',
    topic: 'LLMs',
    description: 'Learn how to use a large language model (LLM) to quickly build new and powerful applications.',
    fullDescription: 'In ChatGPT Prompt Engineering for Developers, you will learn how to use a large language model (LLM) to quickly build new and powerful applications. Using the OpenAI API, you will build capabilities that go beyond standard prompt interfaces, learning to design systems and chatbots of your own.',
    instructorName: 'Instructor 1',
    instructorTitle: 'Core Systems Architect, OpenAI Partner Lab',
    duration: '1 hour',
    lessonCount: '9 lessons',
    rating: 4.9,
    enrolledCount: '450,000+ students',
    partnerName: 'OpenAI',
    skillsAcquired: ['Prompt engineering', 'System instruction', 'Text transformation', 'API Integration', 'Iterative prompt design'],
    requirements: [
      'Basic understanding of programming, ideally Python.',
      'An eagerness to explore generative AI interfaces.'
    ],
    thumbnailBg: 'bg-emerald-950 text-emerald-400',
    thumbnailIconCode: 'prompt',
    isPaid: false,
    syllabus: [
      {
        chapter: 'Lesson 1',
        title: 'Introduction to Prompt Engineering',
        description: 'Understand the rise of LLMs, how API access differs from user-facing UI, and the fundamental shift in rapid software prototyping.'
      },
      {
        chapter: 'Lesson 2',
        title: 'Guidelines for Prompting',
        description: 'Write prompts that use clear and specific instructions, use delimiters, specify output formats, and give the model "time to think."'
      },
      {
        chapter: 'Lesson 3',
        title: 'Iterative Prompt Development',
        description: 'Discover the iterative process of developing prompts, evaluating your model\'s output, and honing instructions to achieve consistent state.'
      },
      {
        chapter: 'Lesson 4',
        title: 'Summarizing Text',
        description: 'Use generative models to summarize customer reviews, extract key talking points, or streamline long-form internal documents.'
      },
      {
        chapter: 'Lesson 5',
        title: 'Inferring and Classification',
        description: 'Perform sentiment analysis, identify topics, extract key product names, and classify user inputs in milliseconds.'
      },
      {
        chapter: 'Lesson 6',
        title: 'Transforming Data',
        description: 'Automate translation, adjust tone for different target demographics, check grammar rules, and convert HTML to structured JSON.'
      },
      {
        chapter: 'Lesson 7',
        title: 'Expanding Prompt Workflows',
        description: 'Create customized emails that dynamically respond to customer sentiment, setting temperature parameters for creativity.'
      },
      {
        chapter: 'Lesson 8',
        title: 'Building a Custom Chatbot',
        description: 'Chain multiple prompts to form conversational structures. Manage system, assistant, and user roles to formulate personalized guides.'
      }
    ]
  },
  {
    id: 'ai-agentic-design-patterns',
    title: 'AI Agentic Design Patterns with AutoGen',
    type: 'Short Course',
    difficulty: 'Intermediate',
    topic: 'Agents',
    description: 'Learn how to curate multi-agent conversations to solve complex programming and writing tasks.',
    fullDescription: 'Discover the power of multi-agent collaboration! Write systems where specialized AI agents with discrete personalities, tools, and constraints collaborate to execute research, write code, analyze data, and solve multi-step problems autonomously.',
    instructorName: 'Instructor 2',
    instructorTitle: 'Principal Systems Architect, Microsoft Research',
    duration: '1 hour',
    lessonCount: '8 lessons',
    rating: 4.8,
    enrolledCount: '120,000+ students',
    partnerName: 'Microsoft',
    skillsAcquired: ['Multi-agent design', 'AutoGen framework', 'Task decomposition', 'Human-in-the-loop steering', 'Tool-augmented agents'],
    requirements: [
      'Intermediate Python knowledge (functions, objects, basic async).',
      'Basic familiarity with OpenAI or similar chat-completed API calls.'
    ],
    thumbnailBg: 'bg-indigo-950 text-indigo-400',
    thumbnailIconCode: 'agents',
    isPaid: true,
    price: 49,
    syllabus: [
      {
        chapter: 'Lesson 1',
        title: 'The Multi-Agent Paradigm',
        description: 'Why build one giant system when you can divide and conquer? Core concepts behind specialized LLM agents.'
      },
      {
        chapter: 'Lesson 2',
        title: 'Configuring Your First Agent',
        description: 'Define agent system messages, model temperatures, and local environments so an agent can write Python safely.'
      },
      {
        chapter: 'Lesson 3',
        title: 'Conversational Playgrounds & AutoGen',
        description: 'Initialize a chat loop between a coder agent and a tester agent, watching them auto-correct errors autonomously.'
      },
      {
        chapter: 'Lesson 4',
        title: 'Integrating Custom Local Tools',
        description: 'Give agents the ability to run internet searches, access SQL tables, or extract structured local data.'
      },
      {
        chapter: 'Lesson 5',
        title: 'Human-in-the-Loop Interruption',
        description: 'Inject real human checks dynamically to verify security, inspect code, or guide agents when they reach stalemates.'
      },
      {
        chapter: 'Lesson 6',
        title: 'Multi-Agent Research Teams',
        description: 'Set up an editorial board with standard workflows: a researcher, a writer, and a critical editor reviewing content.'
      }
    ]
  },
  {
    id: 'deep-learning-specialization',
    title: 'Deep Learning Specialization',
    type: 'Professional Certificate',
    difficulty: 'Advanced',
    topic: 'Deep Learning',
    description: 'Master the fundamentals of Deep Learning, construct neural networks, and lead successful AI projects.',
    fullDescription: 'The Deep Learning Specialization is a foundational program that will help you redefine your career or research. Over five comprehensive modules, you will build deep neural networks from scratch, customize convolutional and recurrent layers, and develop intuition for tuning parameters.',
    instructorName: 'Instructor 3',
    instructorTitle: 'Distinguished Professor, Machine Learning Lab',
    duration: '3 months',
    lessonCount: '45 lessons',
    rating: 4.9,
    enrolledCount: '1.2M+ students',
    partnerName: 'Mountech Academy',
    skillsAcquired: ['Neural networks', 'Backpropagation', 'Hyperparameter tuning', 'Convolutional Nets (CNNs)', 'Transformers & RNNs'],
    requirements: [
      'Good mathematical foundation (linear algebra, basic calculus).',
      'Intermediate proficiency in Python and NumPy matrix operations.'
    ],
    thumbnailBg: 'bg-amber-950 text-amber-500',
    thumbnailIconCode: 'deeplearning',
    isPaid: true,
    price: 149,
    syllabus: [
      {
        chapter: 'Course 1',
        title: 'Neural Networks and Deep Learning',
        description: 'Build a deep neural network from mathematical foundations. Master vectorization, activation functions, and bias propagation.'
      },
      {
        chapter: 'Course 2',
        title: 'Improving Deep Neural Networks',
        description: 'Apply professional optimization techniques: RMSprop, Adam, Batch Normalization, and Dropout. Run hyperparameter tuning grids.'
      },
      {
        chapter: 'Course 3',
        title: 'Structuring Machine Learning Projects',
        description: 'Learn to diagnose errors. Learn how to divide training, development, and test splits while choosing correct metrics.'
      },
      {
        chapter: 'Course 4',
        title: 'Convolutional Neural Networks',
        description: 'Apply CNN models to computer vision tasks, including facial recognition, object detection, and visual style transfer.'
      },
      {
        chapter: 'Course 5',
        title: 'Sequence Models & Transformers',
        description: 'Dive into Recurrent Neural Networks (RNNs), LSTMs, GRUs, and the breakthrough self-attention mechanism powering modern Transformers.'
      }
    ]
  },
  {
    id: 'ai-python-for-beginners',
    title: 'AI Python for Beginners',
    type: 'Course',
    difficulty: 'Beginner',
    topic: 'AI Skills',
    description: 'Gain essential programming skills in Python tailored specially for writing generative AI automations.',
    fullDescription: 'If you want to build with AI, Python is the language that unlocks the door. Designed directly for absolute beginners, this class focuses entirely on the subset of Python you actually need to trigger models, chain automated scripts, and organize data.',
    instructorName: 'Instructor 4',
    instructorTitle: 'Teaching Lead, Code & Scripting School',
    duration: '10 hours',
    lessonCount: '15 lessons',
    rating: 4.7,
    enrolledCount: '85,000+ students',
    partnerName: 'Mountech Academy',
    skillsAcquired: ['Python syntax', 'Control flow', 'Data manipulation', 'Calling API endpoints', 'JSON and text parsing'],
    requirements: [
      'No background in coding whatsoever! This is your absolute square one.'
    ],
    thumbnailBg: 'bg-blue-950 text-blue-440',
    thumbnailIconCode: 'python',
    isPaid: false,
    syllabus: [
      {
        chapter: 'Module 1',
        title: 'Setting the Stage & String Operations',
        description: 'Write your first line of code. Work with variables, read system inputs, and learn to modify textual prompts using Python strings.'
      },
      {
        chapter: 'Module 2',
        title: 'Decisions and Loops',
        description: 'Teach your code to behave intelligently based on criteria using conditions (if/else) and repetitive tasks (for/while iterations).'
      },
      {
        chapter: 'Module 3',
        title: 'Understanding Functions and APIs',
        description: 'Package your commands into reusable chunks. Import standard libraries to send payloads to advanced AI models and receive dynamic answers.'
      },
      {
        chapter: 'Module 4',
        title: 'Handling JSON and API Structures',
        description: 'Parse nested configurations returned by APIs. Handle dictionaries and structural lists to clean up text streams into elegant user grids.'
      }
    ]
  },
  {
    id: 'building-systems-chatgpt-api',
    title: 'Building Systems with the ChatGPT API',
    type: 'Short Course',
    difficulty: 'Intermediate',
    topic: 'LLMs',
    description: 'Understand how to chain LLM calls to construct secure, layered software architectures.',
    fullDescription: 'Go beyond single-prompt bots. Learn how to parse user queries, map them to multi-turn workflows, check for safety guidelines, retrieve specific support guidelines, and construct production-ready pipelines that provide reliable, safe AI responses.',
    instructorName: 'Instructor 5',
    instructorTitle: 'Senior Systems Engineer, OpenAI Integration',
    duration: '1.5 hours',
    lessonCount: '7 lessons',
    rating: 4.9,
    enrolledCount: '280,000+ students',
    partnerName: 'OpenAI',
    skillsAcquired: ['System architecture', 'Input moderation', 'Chaining prompts', 'Chain-of-thought engineering', 'System evaluations'],
    requirements: [
      'Prior participation in ChatGPT Prompt Engineering for Developers or strong basic prompt-tuning skills.'
    ],
    thumbnailBg: 'bg-teal-950 text-teal-400',
    thumbnailIconCode: 'systems',
    isPaid: false,
    syllabus: [
      {
        chapter: 'Lesson 1',
        title: 'Chain-of-Thoughts and Safety',
        description: 'Implement initial safety filters using OpenAI Moderation API to screen out malicious requests or code injection attempts.'
      },
      {
        chapter: 'Lesson 2',
        title: 'Classification of Intent',
        description: 'Categorize incoming support or search requests into predefined buckets, permitting custom downstream queries tailored strictly to user intent.'
      },
      {
        chapter: 'Lesson 3',
        title: 'Evaluating User inputs via Rules',
        description: 'How to use standard documentation dynamically to ground the system\'s thought-process, protecting against hallucinations.'
      },
      {
        chapter: 'Lesson 4',
        title: 'Chaining Prompt Sequences',
        description: 'Break complex specifications into multiple, simpler sub-prompts. Learn why smaller sequential prompts outperform monolithic, detailed instructions.'
      },
      {
        chapter: 'Lesson 5',
        title: 'Output Verification Protocols',
        description: 'Evaluate generated responses against initial safety benchmarks and compliance files before rendering them output in production.'
      }
    ]
  },
  {
    id: 'practical-rag-vector-databases',
    title: 'Practical RAG with Vector Databases',
    type: 'Course',
    difficulty: 'Intermediate',
    topic: 'RAG',
    description: 'Build performant Retrieval-Augmented Generation (RAG) pipelines starting from fundamentals to advanced reranking.',
    fullDescription: 'Bring real-time private file search to your LLM system. In this intermediate class, you will configure document chunking strategies, select dense embeddings, index document collections in a vector index, and retrieve files based on semantic similarity.',
    instructorName: 'Instructor 6',
    instructorTitle: 'Lead Developer, LlamaIndex Partner Lab',
    duration: '6 hours',
    lessonCount: '12 lessons',
    rating: 4.8,
    enrolledCount: '150,050+ students',
    partnerName: 'LlamaIndex',
    skillsAcquired: ['Retrieval Augmented Generation', 'Embedding models', 'Chunking strategies', 'Vector databases', 'Query expansion'],
    requirements: [
      'Familiarity with foundational Python arrays.',
      'Understanding of basic API keys and client-server request dynamics.'
    ],
    thumbnailBg: 'bg-purple-950 text-purple-400',
    thumbnailIconCode: 'rag',
    isPaid: false,
    syllabus: [
      {
        chapter: 'Lesson 1',
        title: 'The Challenge of LLM Memory Limits',
        description: 'Understand the context window boundaries of LLMs and how semantic retrieval resolves data outdatedness and static knowledge constraints.'
      },
      {
        chapter: 'Lesson 2',
        title: 'Document Processing and Chunking',
        description: 'Learn optimal strategies to parse PDFs, Markdown files, and HTML tables into coherent context segments without splitting critical sentences.'
      },
      {
        chapter: 'Lesson 3',
        title: 'Vector Embeddings and Indexing',
        description: 'Generate high-dimensional vector representations of text. Store and index chunks in standard vector databases for cosine search.'
      },
      {
        chapter: 'Lesson 4',
        title: 'Similarity Search & Retrieval',
        description: 'Formulate query search vectors. Retrieve Top-K nearest documents to craft comprehensive prompts with contextual reference files.'
      },
      {
        chapter: 'Lesson 5',
        title: 'Advanced RAG and Reranking',
        description: 'Optimize retrieval pipelines using hybrid keyword keyword matching plus dense embedding search. Use cross-encoder classifiers to rerank candidates.'
      }
    ]
  },
  {
    id: 'generative-ai-with-llms',
    title: 'Generative AI with Large Language Models',
    type: 'Professional Certificate',
    difficulty: 'Intermediate',
    topic: 'LLMs',
    description: 'Learn the lifecycle of LLM-based applications, including fine-tuning, RLHF, and parameter-efficient optimization.',
    fullDescription: 'Gain a deep, full-stack understanding of how to train, adapt, and deploy highly performant large language models in enterprise. Guided by AWS and Stanford experts, you will build applications using current open-weight models (like Llama and Mistral).',
    instructorName: 'Instructor 7',
    instructorTitle: 'Principal Developer Advocate & GenAI Specialist',
    duration: '3 weeks',
    lessonCount: '22 lessons',
    rating: 4.9,
    enrolledCount: '320,000+ students',
    partnerName: 'AWS',
    skillsAcquired: ['LLM training lifecycle', 'Instruction fine-tuning', 'LoRA / QLoRA', 'Reinforcement Learning (RLHF)', 'Model quantization'],
    requirements: [
      'Python knowledge and familiarity with PyTorch or tensor structures.',
      'Familiarity with fundamental machine learning hyperparameters.'
    ],
    thumbnailBg: 'bg-rose-950 text-rose-400',
    thumbnailIconCode: 'genai',
    isPaid: true,
    price: 199,
    syllabus: [
      {
        chapter: 'Week 1',
        title: 'Model Pre-training and Scaling Laws',
        description: 'Understand transformer architectures, decoding strategies, computational costs, and the empirical power laws of pre-training dataset scale.'
      },
      {
        chapter: 'Week 2',
        title: 'Instruction Fine-Tuning & PEFT',
        description: 'Move from generic text continuation to task-oriented instructions. Learn Parameter Efficient Fine-Tuning (PEFT) using LoRA to save VRAM.'
      },
      {
        chapter: 'Week 3',
        title: 'RLHF and Direct Preference Optimization (DPO)',
        description: 'Align model outputs with human preferences regarding helpfulness, safety, and conciseness, building a reward classifier.'
      },
      {
        chapter: 'Week 4',
        title: 'Deployment & Application Chaining',
        description: 'Explore hardware constraints, model compression (quantization like INT8/INT4), and build real testing pipelines on cloud infrastructure.'
      }
    ]
  }
];
