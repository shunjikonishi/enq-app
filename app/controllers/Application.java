package controllers;

import play.mvc.Controller;
import java.io.File;
import java.io.IOException;
import java.sql.SQLException;
import jp.co.flect.io.FileUtils;
import jp.co.flect.formvalidation.FormDefinition;
import jp.co.flect.formvalidation.FormValidationException;

import models.Database;
import models.Salesforce;

public class Application extends Controller {
	
	private static final String JSON;
	private static final FormDefinition FORMDEF;
	
	static {
		String s = null;
		FormDefinition f = null;
		try {
			s = FileUtils.readFileAsString(new File("app/data/form.json"), "utf-8");
			f = FormDefinition.fromJson(s);
		} catch (FormValidationException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		JSON = s;
		FORMDEF = f;
	}
	
	public static void index() throws IOException {
		String title = FORMDEF.getTitle();
		String redirectUrl = "/application/end";
		String json = FileUtils.readFileAsString(new File("app/data/form.json"), "utf-8");
		render(title, redirectUrl, json);
	}
	
	public static void postData(String json) {
		System.out.println("json: " + json);
		try {
			int id = new Database().insert(json);
			if (Salesforce.isAvailable()) {
				new Salesforce.SalesforceJob(id, json).now();
			}
			renderText("OK");
		} catch (SQLException e) {
			renderText(e.getMessage());
		}
	}
	
	public static void end() {
		renderText("ご協力ありがとうございました");
	}
}