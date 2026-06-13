export interface ExamQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const EXAM_DATABASE: Record<string, ExamQuestion[]> = {
  'chatgpt-prompt-engineering': [
    {
      id: 1,
      question: "When interfacing with a Large Language Model (LLM) via API, what is a primary structural benefit of using specific delimiters (like triple backticks or XML tags) around user inputs in your prompt?",
      options: [
        "It minimizes network payload size and saves premium API token charges",
        "It acts as a primary safety boundary, clearly separating untrusted user data from system instructions and helping mitigate prompt injection attempts",
        "It forces the model to use a deterministic temperature of exactly 0.0",
        "It increases execution rate throughput by pre-compiling prompt syntax inside the GPU"
      ],
      correctIndex: 1,
      explanation: "Delimiters create clear boundaries between system instructions and user-supplied content, which helps prevent the model from misinterpreting user data as new command directives (mitigating prompt injections)."
    },
    {
      id: 2,
      question: "What does it mean to give a model 'time to think' when engineering prompts?",
      options: [
        "Slowing down HTTP request rates using custom setTimeout helper hooks",
        "Configuring the model's physical processor architecture to introduce a system latency window",
        "Instructing the model to outline its step-by-step reasoning or calculations before presenting the final answer, rather than rushing to an immediate conclusion",
        "Setting the temperature value to 10.0 to broaden the search matrix"
      ],
      correctIndex: 2,
      explanation: "Specifying that a model must work out its own solution step-by-step first ensures it does not make rapid logical errors, simulating human scratchpad planning."
    },
    {
      id: 3,
      question: "In iterative prompt development, if your model intermittently outputs unstructured formatting, what is the most robust and professional correction strategy?",
      options: [
        "Upgrade to a highly priced custom fine-tuned model immediately",
        "Strictly declare requirements (e.g., target JSON fields) in the system context, provide few-shot structural examples, and instruct the model to conform strictly to a schema",
        "Prefix every single prompt with intense uppercase keywords like 'URGENT OVERRIDE SYSTEM RULES'",
        "Disable API temperature logs and set max tokens to 10"
      ],
      correctIndex: 1,
      explanation: "Defining explicit formatting rules combined with few-shot (example) prompts is the most reliable way to enforce structural conformity in model generations."
    },
    {
      id: 4,
      question: "Performing real-time analysis to identify feelings, themes, or rating scores within product reviews represents which core LLM capability?",
      options: [
        "Text expansion and generation",
        "Inferring / Sentiment Classification",
        "Structural database compilation",
        "Language decoding and encryption"
      ],
      correctIndex: 1,
      explanation: "Identifying semantic signals, emotional sentiment, tone, or category buckets from input documents is classified under the 'Inferring' or 'Classification' capabilities."
    },
    {
      id: 5,
      question: "When orchestrating multi-role dialog in modern Chat Completion interfaces (e.g. ChatGPT API), what is the typical purpose of the 'system' role?",
      options: [
        "To manage API billing and check whether user subscription states are valid",
        "To run automatic malware scans on network sockets during active sessions",
        "To define the global instructions, boundaries, operational rules, and behavioral persona of the model",
        "To store public user search profiles in high-performance localStorage"
      ],
      correctIndex: 2,
      explanation: "The system role provides the foundational instructions that guide the model's entire personality, formatting standards, and constraints across subsequent conversations."
    }
  ],
  'ai-agentic-design-patterns': [
    {
      id: 1,
      question: "What is the key structural design rationale for adopting a multi-agent framework (like Microsoft AutoGen) over a single monolithic helper prompt?",
      options: [
        "Multi-agent libraries disable public API calls to save internet traffic costs",
        "Dividing a complex task amongst highly specialized, distinct agents with clear individual roles and tools allows them to converse, peer-review, and auto-correct errors recursively",
        "A multi-agent design executes natively on local server files without Node.js processes",
        "It increases the token limit of a single model call by utilizing parallel database partitions"
      ],
      correctIndex: 1,
      explanation: "Decomposing complex workflows into specialized agent roles with focused objectives is more modular, robust, and allows self-correction during multi-turn group dynamics."
    },
    {
      id: 2,
      question: "In multi-agent collaborative workflows, what role does a 'tester / validator agent' typically fulfill?",
      options: [
        "Drafting visual layouts using web drawing boards",
        "Executing code in sandboxed environments, capturing compiler stacks, and communicating structured error logs back to the coder agent for iterative patching",
        "Handling user registration webhooks and verifying system logs",
        "Running random manual stress checks on UI action buttons"
      ],
      correctIndex: 1,
      explanation: "A tester agent acts as an automated validation layer, checking code outputs against test cases and giving coder agents precise compiler feedback to trigger corrective processes."
    },
    {
      id: 3,
      question: "Why is 'Human-in-the-Loop Interruption' commonly designed into production-grade agentic environments?",
      options: [
        "To satisfy legal mandates regarding cookie notices",
        "To allow a human supervisor to inspect code safety, provide steering guidance when agents reach deadlocks, or approve high-stakes actions like active database transactions",
        "To convert Python execution logs into visual canvas components",
        "To bypass premium model endpoints and reduce overall operational latency"
      ],
      correctIndex: 1,
      explanation: "Human-in-the-loop ensures high safety, prevents circular reasoning loops, and allows strategic course-corrections inside complex automated workflows."
    },
    {
      id: 4,
      question: "Which mechanism allows an AI agent to programmatically search the web, execute database operations, or interface with external endpoints?",
      options: [
        "Dynamic weight adjustment",
        "Embedding cosine calculations",
        "Function Calling and Dynamic Tool Integration",
        "System prompt instruction embedding"
      ],
      correctIndex: 2,
      explanation: "Function calling allows the model to output a structured JSON schema containing argument variables, which your system executes locally as an API/tool call, returning the output to the agent."
    },
    {
      id: 5,
      question: "What does agent-level 'task decomposition' entail?",
      options: [
        "Deleting inactive file systems and log indexes to clear server space",
        "Splitting a complicated, multi-layered user request into smaller, sequential sub-tasks that can be tackled individually by specific agent roles with dedicated expertise",
        "Downgrading Python syntax structures to legacy levels",
        "Storing raw cookie data securely on local network terminals"
      ],
      correctIndex: 1,
      explanation: "Much like project management, division of labor via task decomposition simplifies hard goals into predictable intermediate goals, enhancing execution fidelity."
    }
  ],
  'deep-learning-specialization': [
    {
      id: 1,
      question: "What is the primary mathematical/computational goal of Backpropagation in neural networks?",
      options: [
        "Measuring validation accuracy score margins on the client-side system",
        "Using the chain rule of calculus to calculate the gradient of the loss function with respect to weights and biases, guiding gradient descent updates",
        "Initializing random weight arrays to break network symmetry at boot time",
        "Reducing active weight matrices to absolute zero to prevent network loss"
      ],
      correctIndex: 1,
      explanation: "Backpropagation propagates the output error backward through the network to calculate the partial derivatives (gradients) used to adjust network weights and minimize loss."
    },
    {
      id: 2,
      question: "How does Dropout serve to regularize a deep neural network during its training cycle?",
      options: [
        "By adjusting learning rates when performance plateaus",
        "By temporarily deactivating a randomly selected portion of neurons during each training batch to reduce co-dependency and prevent neural overfitting",
        "By programmatically trimming records with highly accurate scores from datasets",
        "By converting complex floated matrices into static integers"
      ],
      correctIndex: 1,
      explanation: "By disabling random neurons, Dropout forces the remaining network to learn plural, redundant features, ensuring it does not overfit to specific training patterns."
    },
    {
      id: 3,
      question: "What is a distinguishing characteristic of the widely-used Adam Optimization algorithm?",
      options: [
        "It eliminates mathematical gradients and utilizes basic brute force searches",
        "It dynamically computes adaptive learning rates for each parameter by combining past momentum gradients with past squared gradients (RMSprop properties)",
        "It is constrained exclusively to simple, single-neuron architectures",
        "It prohibits convergence on local minima to maintain high output entropy"
      ],
      correctIndex: 1,
      explanation: "Adam (Adaptive Moment Estimation) leverages exponentially decaying averages of past gradients (momentum) and past squared gradients to deliver refined parameter step scaling."
    },
    {
      id: 4,
      question: "What structural mechanism enables Convolutional Neural Networks (CNNs) to excel at spatial computer vision tasks?",
      options: [
        "They translate visual frames into raw acoustic waves",
        "They utilize parameter sharing, local receptive fields, and pooling layers to capture translation-invariant patterns like edges, textures, and progressive forms",
        "They carry out operations without weights or math formulas",
        "They flatten input grids into single-dimension string arrays immediately"
      ],
      correctIndex: 1,
      explanation: "CNNs exploit spatial structure by learning local filters that apply across the entire image dimension, allowing feature recognition regardless of position."
    },
    {
      id: 5,
      question: "Which landmark concept powers parallel token analysis and forms the foundation of modern Transformer designs?",
      options: [
        "Sigmoidal gate decay loops",
        "The Self-Attention Mechanism (dynamically scoring the contextual relationship of each token in a block relative to every other token)",
        "Heuristic search logic models",
        "Stochastic gradient decay scales"
      ],
      correctIndex: 1,
      explanation: "Self-attention enables massive parallelism during training and captures complex, long-range context dependencies across terms, replacing sequential recurrence (like RNNs)."
    }
  ],
  'ai-python-for-beginners': [
    {
      id: 1,
      question: "Which Python keyword must be written to initiate a reusable block of operations as a function?",
      options: [
        "func",
        "define",
        "def",
        "class"
      ],
      correctIndex: 2,
      explanation: "In Python, the 'def' keyword is the language standard used to declare/define a reusable block of functional logic."
    },
    {
      id: 2,
      question: "What structural string format is most commonly used by modern web APIs to transmit structured data blocks over HTTP?",
      options: [
        "Plain Markdown lists",
        "Hexadecimal streams",
        "JSON (JavaScript Object Notation), which parses directly into a Python dictionary",
        "Comma-separated text tables"
      ],
      correctIndex: 2,
      explanation: "JSON is the standard format for web data serialization; in Python, it parses cleanly into native nested dictionaries and lists."
    },
    {
      id: 3,
      question: "What is the structural purpose of an 'if-elif-else' block in a program?",
      options: [
        "To execute a sequence of statements repeatedly until a condition evaluates to false",
        "To direct program control flow along differing branches depending on Boolean condition criteria",
        "To execute matrix computations across GPU clusters",
        "To encrypt personal user tokens before database synchronization"
      ],
      correctIndex: 1,
      explanation: "Conditional statements (if-elif-else) provide decision-making logic, routing execution based on whether specific expressions are true or false."
    },
    {
      id: 4,
      question: "In Python, if arrays are defined as lists, what action is performed by declaring item_list.append(new_item)?",
      options: [
        "It removes the first element from 'item_list'",
        "It inserts 'new_item' as a new element at the very end of 'item_list'",
        "It clears out all active indices of the variable",
        "It counts the mathematical size of the collection"
      ],
      correctIndex: 1,
      explanation: "The `.append()` method modifies the list in place, adding the specified value as a new, trailing item."
    },
    {
      id: 5,
      question: "What statement structure represents the best practice in Python to protect against application crashes when handling external files or parsing insecure API records?",
      options: [
        "A 'try-except' block to capture raised exceptions gracefully and execute alternative recovery actions",
        "Writing a recursive infinite loop",
        "Deleting the error logs from the server directory",
        "Disabling the function completely inside the file"
      ],
      correctIndex: 0,
      explanation: "A 'try-except' block allows a script to attempt high-risk actions (such as network calls) and intercept failures gracefully instead of crashing."
    }
  ],
  'building-systems-chatgpt-api': [
    {
      id: 1,
      question: "Why does modern software architecture prefer chaining smaller, sequenced prompts over writing a single monolithic system prompt containing all instructions?",
      options: [
        "Monolithic prompts incur cheaper token consumption charges",
        "Chaining prompts simplifies debugging, reduces the model's cognitive load, guarantees precise intermediate validation, and minimizes broad context confusion",
        "smaller prompts increase server response speeds by 10x",
        "Chained workflows prevent any use of markdown structures"
      ],
      correctIndex: 1,
      explanation: "Breaking complex processes into smaller sequential prompt steps ensures higher reliability, allows focused error checking at each node, and scales context efficiently."
    },
    {
      id: 2,
      question: "Which of the following is constructed specifically to inspect user input flags for harmful content, self-harm signals, or hate speech before routing prompts?",
      options: [
        "The OpenAI Moderation API endpoint",
        "Dynamic dense retrieval vectors",
        "The standard system template compiler",
        "Local session storage index files"
      ],
      correctIndex: 0,
      explanation: "The Moderation API is an optimized, free classification tool designed to flag policy compliance violations prior to model generation."
    },
    {
      id: 3,
      question: "How can you protect an LLM-driven support chatbot from user attempts to override instructions and fetch system configurations?",
      options: [
        "IP-filter all inbound requests to exclude English language keywords",
        "Leverage separate system, developer, and user roles, structured schemas, clean delimiters, and robust validation rules that reject instruction phrasing in user blocks",
        "Rotate application API tokens every 24 hours",
        "Remove clear punctuation marks from input fields"
      ],
      correctIndex: 1,
      explanation: "Using systemic role boundaries, XML delimiters, and post-generation evaluation guards are standard security patterns for defending against prompt override attacks."
    },
    {
      id: 4,
      question: "What does 'grounding' represent in the context of commercial system engineering with LLMs?",
      options: [
        "Disabling external internet connectivity to prevent any token leaking",
        "Resetting active system servers when usage loads exceed threshold limits",
        "Injecting verified, factual context (such as custom documents or database lookups) into the prompt so the model bases its answer strictly on factual source data",
        "Flushing local command terminal histories monthly"
      ],
      correctIndex: 2,
      explanation: "Grounding feeds reliable, external context directly into the prompt context, preventing the model from generating plausible but incorrect explanations (hallucinations)."
    },
    {
      id: 5,
      question: "What is the primary role of an 'output verification protocol' in systems utilizing generative models?",
      options: [
        "Measuring exact character quantities in server console lines",
        "Programmatically checking model-generated responses against safety, compliance, quality, and formatting benchmarks prior to presenting them to the client",
        "Deducting payment fees from student account structures",
        "Refreshing active development servers when a request fails"
      ],
      correctIndex: 1,
      explanation: "Output validation evaluates generative responses using secondary classifiers, regex, or structured tests to ensure that uncooperative, invalid, or policy-violating text is caught."
    }
  ],
  'practical-rag-vector-databases': [
    {
      id: 1,
      question: "What is document 'chunking' in Retrieval-Augmented Generation (RAG) pipelines, and why is it crucial?",
      options: [
        "The physical separation of PDF folders to save local disk partition assets",
        "Segmenting long source documents into logical, smaller text passages to fit within model context limits, preserve semantic consistency, and locate precise paragraphs of interest",
        "Applying modern formatting compression keys (like ZIP files)",
        "Converting complex floated lists into standard system binary codes"
      ],
      correctIndex: 1,
      explanation: "Chunking splits long content into manageable pieces. This matches LLM token windows and guarantees similarity searches target precise paragraphs rather than whole books."
    },
    {
      id: 2,
      question: "What do dense embedding models map textual blocks into?",
      options: [
        "Flat human-readable HTML markup templates",
        "High-dimensional numeric arrays where spatial distance (such as cosine distance) corresponds to semantic or conceptual similarity of content",
        "Highly compressed private database records",
        "Sequential line items of active developer log terminals"
      ],
      correctIndex: 1,
      explanation: "Embeddings represent words/documents as numerical vectors. This mathematical representation maps semantic meanings to dimensions, making comparison computable."
    },
    {
      id: 3,
      question: "Which formula is most commonly used in RAG systems to score similarity between a user query vector and a document vector?",
      options: [
        "Basic string edit distance (Levenshtein Distance)",
        "Character length parity counting",
        "Cosine Similarity (or vector dot-product normalized values)",
        "The standard system port index margin"
      ],
      correctIndex: 2,
      explanation: "Cosine similarity measures the angle between two multi-dimensional vectors, evaluating topical similarity regardless of absolute document length."
    },
    {
      id: 4,
      question: "Retrieval-Augmented Generation (RAG) directly mitigates which critical LLM limitation?",
      options: [
        "High localized font styling latency",
        "Plausible hallucinations and lack of access to private, real-time, or highly dynamically updating facts, by supplying current data directly within the prompt template",
        "Excessive electricity usage in GPU clusters",
        "Keyboard typing delays on legacy operating platforms"
      ],
      correctIndex: 1,
      explanation: "RAG bypasses static training limitations by dynamically pulling accurate, outside information into the prompt, grounding the generation process."
    },
    {
      id: 5,
      question: "Why is an embedding-based semantic search preferred over standard keyword index querying in complex customer support RAG search systems?",
      options: [
        "Because semantic search operates completely without server computing resources or API tokens",
        "Because it understands underlying context, intent, synonyms, and multi-word query themes, rather than matching exact characters of text",
        "Because it handles file conversions into bundled CJS outputs automatically",
        "Because keyword index queries require specialized private keys"
      ],
      correctIndex: 1,
      explanation: "Semantic search captures meaning. A search for 'repair instructions' can successfully retrieve 'troubleshooting manual' even if there are no exact keyword overlaps."
    }
  ],
  'generative-ai-with-llms': [
    {
      id: 1,
      question: "What does the method of 'Instruction Fine-Tuning' represent?",
      options: [
        "Manually tweaking learning rate decay charts during secondary training runs",
        "Training a pre-trained base model on large formatted datasets of task instructions paired with corresponding expected responses to make it function as a conversational assistant",
        "Clearing out heavy network layer matrices to optimize CPU performance",
        "Writing detailed prompt text instructions using XML delimiters"
      ],
      correctIndex: 1,
      explanation: "Instruction fine-tuning transforms raw base text-predictors (which merely guess next words) into cooperative chatbots that understand and complete human prompts."
    },
    {
      id: 2,
      question: "Which parameter should you reduce in your generative API variables to make LLM outputs highly deterministic, repeatable, and stable?",
      options: [
        "The prompt character count",
        "The generation temperature (approaching 0.0)",
        "The random generator seed maximum scaling",
        "The hidden layer nodes count inside active parameters"
      ],
      correctIndex: 1,
      explanation: "Lowering the temperature parameter makes the model's word selection highly greedy/deterministic, outputting the most probable tokens each time."
    },
    {
      id: 3,
      question: "What is Reinforcement Learning from Human Feedback (RLHF) primarily used for during model alignment?",
      options: [
        "Unlocking faster floating-point computations on advanced tensor units",
        "Aligning model behaviors with human intentions, ensuring generations are helpful, honest, harmless, and safe across different situations",
        "Translating Python compiler scripts dynamically into browser components",
        "Creating high-resolution synthetic imagery for image training sets"
      ],
      correctIndex: 1,
      explanation: "RLHF trains a reward model based on human preference ratings, optimization-tuning the LLM to output safe and aligned answers, preventing toxic generations."
    },
    {
      id: 4,
      question: "What represents a fundamental technical limit of relying purely on an LLM's built-in parameters to resolve real-world user queries?",
      options: [
        "Extreme server API key charges",
        "Context window boundaries (finite token processing capacity) and the possibility of hallucinations without external grounding filters",
        "Inefficient console terminal output displays",
        "The inability to execute simple float division arithmetic"
      ],
      correctIndex: 1,
      explanation: "LLMs have a finite context length and are static frozen snapshots of their training. Without grounding systems, they cannot reliably serve real-time or massive custom datasets safely."
    },
    {
      id: 5,
      question: "What is the vital function of the 'Self-Attention' layer in Transformer-based architectures?",
      options: [
        "Synchronizing user balances with payment system accounts",
        "Calculating mathematical weight coefficients that represent how contextually relevant other tokens are to any specific token in a sequence",
        "Restricting generative content to single paragraphs when streaming",
        "Closing server connections to save regional workspace resources"
      ],
      correctIndex: 1,
      explanation: "Self-attention determines the relational importance between all words in an input block. This allows the model to connect related concepts across long sentences."
    }
  ]
};
