import axios from 'axios'
import FormData from 'form-data'

// Pinata credentials - store these in .env file
const PINATA_API_KEY = "YOUR_PINATA_API_KEY"
const PINATA_SECRET_KEY = "YOUR_PINATA_SECRET_KEY"
const PINATA_JWT = "YOUR_PINATA_JWT" // You can use JWT instead of API key/secret

export class IPFSHelper {
  constructor() {
    this.baseURL = 'https://api.pinata.cloud'
    this.headers = {
      'Authorization': `Bearer ${PINATA_JWT}`
      // Alternatively, use API key/secret:
      // 'pinata_api_key': PINATA_API_KEY,
      // 'pinata_secret_api_key': PINATA_SECRET_KEY
    }
  }

  /**
   * Upload a file to IPFS via Pinata
   * @param {File} file - The file to upload
   * @param {string} name - Name for the file
   * @returns {Promise<string>} - IPFS hash (CID)
   */
  async uploadFile(file, name) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const metadata = JSON.stringify({
        name: name,
        keyvalues: {
          date: new Date().toISOString(),
          type: file.type
        }
      })
      formData.append('pinataMetadata', metadata)

      // Optional: Add pinata options
      const pinataOptions = JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false
      })
      formData.append('pinataOptions', pinataOptions)

      const response = await axios.post(
        `${this.baseURL}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            ...this.headers,
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`
          },
          maxBodyLength: 'Infinity'
        }
      )

      return response.data.IpfsHash
    } catch (error) {
      console.error('Error uploading file to IPFS:', error)
      throw error
    }
  }

  /**
   * Upload JSON metadata to IPFS
   * @param {Object} metadata - The metadata object to upload
   * @param {string} name - Name for the metadata file
   * @returns {Promise<string>} - IPFS hash (CID)
   */
  async uploadMetadata(metadata, name) {
    try {
      const response = await axios.post(
        `${this.baseURL}/pinning/pinJSONToIPFS`,
        {
          pinataContent: metadata,
          pinataMetadata: {
            name: name,
            keyvalues: {
              date: new Date().toISOString()
            }
          }
        },
        {
          headers: this.headers
        }
      )

      return response.data.IpfsHash
    } catch (error) {
      console.error('Error uploading metadata to IPFS:', error)
      throw error
    }
  }

  /**
   * Upload project documentation and metadata
   * @param {Object} project - Project details
   * @param {File[]} files - Array of files to upload
   * @returns {Promise<string>} - IPFS hash of the project metadata
   */
  async uploadProjectDocumentation(project, files) {
    try {
      // Upload all files first
      const filePromises = files.map(file => 
        this.uploadFile(file, file.name)
      )
      const fileHashes = await Promise.all(filePromises)

      // Create project metadata with file references
      const projectMetadata = {
        ...project,
        files: fileHashes.map((hash, index) => ({
          name: files[index].name,
          type: files[index].type,
          size: files[index].size,
          hash: hash
        })),
        createdAt: new Date().toISOString()
      }

      // Upload the project metadata
      return await this.uploadMetadata(
        projectMetadata,
        `project-${project.title}-metadata`
      )
    } catch (error) {
      console.error('Error uploading project documentation:', error)
      throw error
    }
  }

  /**
   * Upload milestone deliverables
   * @param {Object} milestone - Milestone details
   * @param {File[]} deliverables - Array of deliverable files
   * @returns {Promise<string>} - IPFS hash of the milestone metadata
   */
  async uploadMilestoneDeliverables(milestone, deliverables) {
    try {
      // Upload all deliverable files
      const deliverablePromises = deliverables.map(file => 
        this.uploadFile(file, file.name)
      )
      const deliverableHashes = await Promise.all(deliverablePromises)

      // Create milestone metadata with deliverable references
      const milestoneMetadata = {
        ...milestone,
        deliverables: deliverableHashes.map((hash, index) => ({
          name: deliverables[index].name,
          type: deliverables[index].type,
          size: deliverables[index].size,
          hash: hash
        })),
        submittedAt: new Date().toISOString()
      }

      // Upload the milestone metadata
      return await this.uploadMetadata(
        milestoneMetadata,
        `milestone-${milestone.id}-deliverables`
      )
    } catch (error) {
      console.error('Error uploading milestone deliverables:', error)
      throw error
    }
  }

  /**
   * Get content from IPFS
   * @param {string} hash - IPFS hash (CID)
   * @returns {Promise<any>} - Content from IPFS
   */
  async getContent(hash) {
    try {
      const gateway = 'https://gateway.pinata.cloud/ipfs'
      const response = await axios.get(`${gateway}/${hash}`)
      return response.data
    } catch (error) {
      console.error('Error fetching content from IPFS:', error)
      throw error
    }
  }

  /**
   * Unpin content from Pinata
   * @param {string} hash - IPFS hash (CID) to unpin
   * @returns {Promise<void>}
   */
  async unpinContent(hash) {
    try {
      await axios.delete(
        `${this.baseURL}/pinning/unpin/${hash}`,
        { headers: this.headers }
      )
    } catch (error) {
      console.error('Error unpinning content:', error)
      throw error
    }
  }
}

// Export singleton instance
export const ipfsHelper = new IPFSHelper()
