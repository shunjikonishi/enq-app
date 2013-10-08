package models;

import jp.co.flect.salesforce.SalesforceClient;
import jp.co.flect.salesforce.SObject;
import jp.co.flect.salesforce.Metadata;
import jp.co.flect.soap.InvalidWSDLException;
import jp.co.flect.soap.SoapException;
import jp.co.flect.soap.WSDL;
import jp.co.flect.xmlschema.XMLSchemaException;
import jp.co.flect.json.JsonUtils;
import jp.co.flect.json.JsonException;
import java.util.Map;
import java.io.File;
import java.io.IOException;
import java.sql.SQLException;
import org.xml.sax.SAXException;
import play.jobs.Job;
import play.Logger;

public class Salesforce {
	
	private static final String USERNAME = System.getenv("SALESFORCE_USERNAME");
	private static final String PASSWORD = System.getenv("SALESFORCE_PASSWORD");
	private static final String TOKEN    = System.getenv("SALESFORCE_TOKEN");
	private static final String OBJECT_NAME = System.getenv("SALESFORCE_OBJECT_NAME");
	
	public static boolean isAvailable() {
		return USERNAME != null && PASSWORD != null && TOKEN != null && OBJECT_NAME != null;
	}
	
	private static long LOGIN_TIME = 0;
	private static SalesforceClient BASE_CLIENT;
	
	public static synchronized WSDL getWSDL() {
		if (BASE_CLIENT == null) {
			try {
				createClient();
			} catch (IOException e) {
				//ignore
				e.printStackTrace();
			} catch (SoapException e) {
				//ignore
				e.printStackTrace();
			}
		}
		return BASE_CLIENT.getWSDL();
	}
	
	public static synchronized SalesforceClient createClient() throws IOException, SoapException {
		if (BASE_CLIENT == null) {
			try {
				BASE_CLIENT = new SalesforceClient(new File("conf/partner.wsdl"));
			} catch (XMLSchemaException e) {
				//not occur
				throw new IllegalStateException(e);
			} catch (InvalidWSDLException e) {
				//not occur
				throw new IllegalStateException(e);
			} catch (SAXException e) {
				//not occur
				throw new IllegalStateException(e);
			}
			LOGIN_TIME = System.currentTimeMillis();
			BASE_CLIENT.login(USERNAME, PASSWORD, TOKEN);
		}
		long t = System.currentTimeMillis();
		if (t - LOGIN_TIME > BASE_CLIENT.getSessionLifetime()) {
			BASE_CLIENT.login(USERNAME, PASSWORD, TOKEN);
			LOGIN_TIME = t;
		}
		SalesforceClient client = new SalesforceClient(BASE_CLIENT);
		return client;
	}
	
	public static class SalesforceJob extends Job {
		
		private int id;
		private String json;
		
		public SalesforceJob(int id, String json) {
			this.id = id;
			this.json = json;
		}
		
		public void doJob() {
			try {
				Map<String, Object> map = JsonUtils.fromJsonToMap(this.json);
				SalesforceClient client = createClient();
				SObject obj = client.newObject(OBJECT_NAME);
				for (Map.Entry<String, Object> entry : map.entrySet()) {
					String key = entry.getKey();
					Object value = entry.getValue();
					if (value != null) {
						obj.set(key, value);
					}
				}
				client.create(obj);
				updateStatus(Database.STATE_UPDATE);
			} catch (JsonException e) {
				e.printStackTrace();
				updateStatus(Database.STATE_ERROR);
			} catch (IOException e) {
				e.printStackTrace();
				updateStatus(Database.STATE_ERROR);
			} catch (SoapException e) {
				e.printStackTrace();
				updateStatus(Database.STATE_ERROR);
			}
		}
		
		private void updateStatus(String state) {
			try {
				new Database().updateStatus(this.id, state);
			} catch (SQLException e) {
				e.printStackTrace();
			}
		}
	}
}
