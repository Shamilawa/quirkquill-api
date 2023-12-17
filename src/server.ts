const PORT = 8000
import express, { Request, Response } from 'express'
import cors from 'cors'
import { GoogleGenerativeAI, InputContent } from '@google/generative-ai'
require('dotenv').config()

enum USER_ROLE {
    model = 'model',
    user = 'user',
}

interface ISingleMessageType {
    userType: USER_ROLE
    message: string
}

interface IGrammaticalErrorCatchType {
    isGrammarErrors: boolean
    errorDescription: string | undefined
}

interface IResponseType extends ISingleMessageType {
    grammarCheck: IGrammaticalErrorCatchType
}

const genAI = new GoogleGenerativeAI(process.env.LANGUAGE_MODEL_API_KEY as string)

const app = express()

app.use(express.json())
app.use(cors())

app.post('/prompt', async (req: Request, res: Response) => {
    const { userInput, messageHistory } = req.body

    let chatHistory: InputContent[] = messageHistory.map((message: ISingleMessageType) => {
        return {
            role: message.userType,
            parts: message.message,
        }
    })

    if (!userInput) {
        res.send({ message: 'Please enter message' })
    }

    try {
        // Get the specific Generative AI model ("gemini-pro")
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

        const grammarResult = await model.generateContent(
            `Is this quoted paragraph contain any grammatical errors? If so response with that particular grammatical error. Provide descriptive response on that particular grammatical error. If there are no grammatical errors, just reply with the 'NO'. Here is the paragraph ${userInput.message}`,
        )

        const grammarResponse = await grammarResult.response

        // chat session
        // Start a chat session with the model and provided history
        const chat = model.startChat({
            history: chatHistory,
        })

        // Send user's input message to the model and wait for response
        const result = await chat.sendMessage(userInput.message)
        const response = await result.response
        // Extract and send the model's generated text as a message with "model" type
        const reply = response.text()
        res.send({
            userType: USER_ROLE.model,
            message: reply,
            grammarCheck: {
                isGrammarErrors: grammarResponse.text() === 'NO' ? false : true,
                errorDescription: grammarResponse.text() === 'NO' ? undefined : grammarResponse.text(),
            },
        } as IResponseType)
    } catch (error) {
        // Handle errors during model interaction and send generic error message
        res.send({ message: 'Internal Error' })
    }
})

// Start the server on specified port and log confirmation message
app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
